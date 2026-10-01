import nodemailer, { type Transporter } from 'nodemailer'
import { prisma } from './db'
import { env, hasSmtp } from './env'

let transporter: Transporter | null = null

function getTransporter(): Transporter | null {
  if (!hasSmtp) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      pool: true,
      maxConnections: 3,
    })
  }
  return transporter
}

export interface SendMailInput {
  to: string
  subject: string
  html: string
  template: string
  orderId?: string
}

/**
 * Sends an HTML email through Gmail SMTP and records the attempt in the
 * notification log so admins can see delivery status per order.
 */
export async function sendMail(input: SendMailInput) {
  const log = await prisma.notificationLog.create({
    data: {
      orderId: input.orderId,
      channel: 'EMAIL',
      template: input.template,
      recipient: input.to,
      subject: input.subject,
      status: hasSmtp ? 'QUEUED' : 'SKIPPED_NO_SMTP',
    },
  })

  const mailer = getTransporter()
  if (!mailer) {
    console.warn(`[mail] SMTP not configured — skipped "${input.template}" to ${input.to}`)
    return { sent: false, reason: 'smtp_not_configured' as const }
  }

  try {
    const info = await mailer.sendMail({
      from: env.SMTP_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
    })
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: 'SENT', sentAt: new Date(), providerMessageId: info.messageId },
    })
    return { sent: true as const, messageId: info.messageId }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    await prisma.notificationLog.update({ where: { id: log.id }, data: { status: 'FAILED', error: message } })
    console.error('[mail]', message)
    return { sent: false as const, reason: message }
  }
}

export const mailerConfigured = hasSmtp
