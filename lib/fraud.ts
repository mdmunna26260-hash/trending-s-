import { prisma } from './db'
import { env, hasFraudApi } from './env'
import { ApiError } from './http'
import { orderVelocityCount, registerOrderVelocity } from './ratelimit'

export type Verdict = 'PASS' | 'REVIEW' | 'BLOCK'

export interface FraudAssessment {
  score: number
  status: 'PENDING' | 'PASSED' | 'REVIEW' | 'BLOCKED'
  checks: Array<{ provider: string; result: Verdict; score: number; summary: string }>
  blockReason?: string
}

interface BlacklistMatch {
  type: string
  value: string
  severity: string
  reason?: string | null
}

export async function findBlacklistMatches(values: {
  phone: string
  email?: string | null
  ip: string
  customerId?: string | null
  address?: string
}): Promise<BlacklistMatch[]> {
  const lookup: Array<{ type: string; value: string }> = [
    { type: 'PHONE', value: values.phone },
    { type: 'IP', value: values.ip },
  ]
  if (values.email) lookup.push({ type: 'EMAIL', value: values.email })
  if (values.customerId) lookup.push({ type: 'CUSTOMER', value: values.customerId })

  const rows = await prisma.blacklist.findMany({
    where: {
      isActive: true,
      OR: [
        ...lookup.map((item) => ({ type: item.type as any, value: item.value })),
        ...(values.address ? [{ type: 'ADDRESS' as any, value: values.address }] : []),
      ],
    },
  })

  // Address blacklisting is fuzzy: any active ADDRESS entry whose text appears
  // in the submitted address blocks the order.
  const addressMatches = values.address
    ? rows.filter((row) => row.type === 'ADDRESS' && values.address!.toLowerCase().includes(row.value.toLowerCase()))
    : []
  return [...rows.filter((row) => row.type !== 'ADDRESS'), ...addressMatches] as BlacklistMatch[]
}

async function callFraudProvider(phone: string) {
  if (!hasFraudApi) return null
  try {
    const response = await fetch(`${env.FRAUD_API_URL!.replace(/\/$/, '')}/${encodeURIComponent(phone)}`, {
      headers: { Authorization: `Bearer ${env.FRAUD_API_KEY}`, Accept: 'application/json' },
    })
    if (!response.ok) return null
    const data = await response.json()
    return {
      result: (data?.verdict || data?.result || 'PASS').toString().toUpperCase() as Verdict,
      score: Number(data?.score ?? data?.risk ?? 0),
      summary: String(data?.summary || data?.message || 'External fraud API'),
      details: data,
    }
  } catch {
    return null
  }
}

/**
 * Runs every available fraud signal for a prospective order and persists the
 * results. Order creation refuses to continue when the verdict is BLOCK.
 */
export async function assessOrderFraud(input: {
  orderNumber?: string
  orderId?: string
  customerId?: string | null
  phone: string
  email?: string | null
  ip: string
  address: string
  grandTotal: number
  itemCount: number
}): Promise<FraudAssessment> {
  const checks: FraudAssessment['checks'] = []

  // 1. Local blacklist ------------------------------------------------------
  const blacklist = await findBlacklistMatches(input)
  const blocking = blacklist.find((entry) => entry.severity === 'BLOCK')
  const warning = blacklist.find((entry) => entry.severity === 'REVIEW' || entry.severity === 'WARN')
  if (blocking) {
    checks.push({
      provider: 'BLACKLIST',
      result: 'BLOCK',
      score: 100,
      summary: `${blocking.type} blacklisted${blocking.reason ? `: ${blocking.reason}` : ''}`,
    })
  } else if (warning) {
    checks.push({
      provider: 'BLACKLIST',
      result: 'REVIEW',
      score: 40,
      summary: `${warning.type} flagged (${warning.severity})`,
    })
  } else {
    checks.push({ provider: 'BLACKLIST', result: 'PASS', score: 0, summary: 'No blacklist match' })
  }

  // 2. Customer fraud history ---------------------------------------------
  if (input.customerId) {
    const history = await prisma.order.groupBy({
      by: ['status'],
      where: { customerId: input.customerId },
      _count: { _all: true },
    })
    const total = history.reduce((sum, row) => sum + row._count._all, 0)
    const bad = history
      .filter((row) => row.status === 'CANCELLED' || row.status === 'RETURNED')
      .reduce((sum, row) => sum + row._count._all, 0)
    const rate = total ? bad / total : 0
    checks.push({
      provider: 'CUSTOMER_HISTORY',
      result: total >= 3 && rate >= 0.6 ? 'BLOCK' : total >= 2 && rate >= 0.4 ? 'REVIEW' : 'PASS',
      score: Math.round(rate * 100),
      summary: total ? `${bad} of ${total} orders cancelled/returned` : 'No prior orders',
    })
  }

  // 3. Steadfast fraud check ----------------------------------------------
  try {
    const { checkFraud } = await import('./couriers/steadfast')
    const steadfast = await checkFraud(input.phone)
    checks.push({ provider: 'STEADFAST', ...steadfast })
  } catch (error) {
    checks.push({
      provider: 'STEADFAST',
      result: 'PASS',
      score: 0,
      summary: error instanceof ApiError && error.status === 503 ? 'Steadfast not configured' : 'Steadfast check failed',
    })
  }

  // 4. External fraud provider (FraudBD / other) ---------------------------
  const external = await callFraudProvider(input.phone)
  if (external) checks.push({ provider: 'FRAUD_API', ...external })

  // 5. Order velocity ------------------------------------------------------
  const velocity = await registerOrderVelocity(input.phone, input.ip)
  const velocityResult: Verdict = velocity >= 5 ? 'BLOCK' : velocity >= 3 ? 'REVIEW' : 'PASS'
  checks.push({
    provider: 'VELOCITY',
    result: velocityResult,
    score: velocity * 15,
    summary: `${velocity} orders from this phone/IP in the last hour`,
  })

  // 6. Heuristics ----------------------------------------------------------
  const heuristics: string[] = []
  let heuristicScore = 0
  if (input.grandTotal >= 2000000) {
    heuristics.push('Unusually large first order value')
    heuristicScore += 20
  }
  if (input.itemCount >= 8) {
    heuristics.push('Very high item count')
    heuristicScore += 10
  }
  if (!input.email && input.grandTotal >= 500000) {
    heuristics.push('High value order without email')
    heuristicScore += 5
  }
  checks.push({
    provider: 'HEURISTICS',
    result: heuristicScore >= 20 ? 'REVIEW' : 'PASS',
    score: heuristicScore,
    summary: heuristics.length ? heuristics.join('; ') : 'No anomalies detected',
  })

  const score = Math.min(100, checks.reduce((sum, check) => sum + check.score, 0))
  const hasBlock = checks.some((check) => check.result === 'BLOCK')
  const hasReview = checks.some((check) => check.result === 'REVIEW')
  const status: FraudAssessment['status'] = hasBlock ? 'BLOCKED' : hasReview ? 'REVIEW' : 'PASSED'

  const assessment: FraudAssessment = {
    score,
    status,
    checks,
    blockReason: hasBlock ? checks.find((check) => check.result === 'BLOCK')?.summary : undefined,
  }

  await prisma.fraudCheck.createMany({
    data: checks.map((check) => ({
      orderId: input.orderId,
      customerId: input.customerId,
      phone: input.phone,
      provider: check.provider,
      result: check.result === 'PASS' ? 'PASSED' : check.result === 'REVIEW' ? 'REVIEW' : 'BLOCKED',
      score: check.score,
      summary: check.summary,
      details: check.provider === 'FRAUD_API' ? (external?.details as never) : undefined,
    })),
  })

  return assessment
}

export async function getVelocity(phone: string, ip: string) {
  return orderVelocityCount(phone, ip)
}
