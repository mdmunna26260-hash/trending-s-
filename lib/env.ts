import { z } from 'zod'

/**
 * Centralised, validated access to environment variables.
 * Only `NEXT_PUBLIC_*` values may ever reach the browser.
 */
export interface ServerEnv {
  DATABASE_URL: string
  AUTH_SECRET: string
  SITE_URL: string
  ADMIN_EMAIL: string
  ADMIN_PASSWORD: string
  ADMIN_NAME: string
  STEADFAST_API_KEY: string
  STEADFAST_SECRET_KEY: string
  STEADFAST_BASE_URL: string
  FRAUD_API_URL: string
  FRAUD_API_KEY: string
  FRAUDBD_API_KEY: string
  SMTP_HOST: string
  SMTP_PORT: number
  SMTP_SECURE: boolean
  SMTP_USER: string
  SMTP_PASS: string
  SMTP_FROM: string
  META_CONVERSIONS_API_TOKEN: string
  META_TEST_EVENT_CODE: string
  SMS_API_URL: string
  SMS_API_KEY: string
  SMS_SENDER_ID: string
}

const schema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  SITE_URL: z.string().url().default('http://localhost:3000'),
  ADMIN_EMAIL: z.string().email().default('mdmunna26260@gmail.com'),
  ADMIN_PASSWORD: z.string().min(8).default('KissmeBabu64'),
  ADMIN_NAME: z.string().default('Store Owner'),
  STEADFAST_API_KEY: z.string().optional().default(''),
  STEADFAST_SECRET_KEY: z.string().optional().default(''),
  STEADFAST_BASE_URL: z.string().url().default('https://portal.packzy.com/api/v1'),
  FRAUD_API_URL: z.string().optional().default(''),
  FRAUD_API_KEY: z.string().optional().default(''),
  FRAUDBD_API_KEY: z.string().optional().default(''),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_SECURE: z.coerce.boolean().default(true),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().default('RUVIO <no-reply@example.com>'),
  META_CONVERSIONS_API_TOKEN: z.string().optional().default(''),
  META_TEST_EVENT_CODE: z.string().optional().default(''),
  SMS_API_URL: z.string().optional().default(''),
  SMS_API_KEY: z.string().optional().default(''),
  SMS_SENDER_ID: z.string().optional().default(''),
})

const raw = {
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  ADMIN_NAME: process.env.ADMIN_NAME,
  STEADFAST_API_KEY: process.env.STEADFAST_API_KEY,
  STEADFAST_SECRET_KEY: process.env.STEADFAST_SECRET_KEY,
  STEADFAST_BASE_URL: process.env.STEADFAST_BASE_URL,
  FRAUD_API_URL: process.env.FRAUD_API_URL,
  FRAUD_API_KEY: process.env.FRAUD_API_KEY,
  FRAUDBD_API_KEY: process.env.FRAUDBD_API_KEY,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM,
  META_CONVERSIONS_API_TOKEN: process.env.META_CONVERSIONS_API_TOKEN,
  META_TEST_EVENT_CODE: process.env.META_TEST_EVENT_CODE,
  SMS_API_URL: process.env.SMS_API_URL,
  SMS_API_KEY: process.env.SMS_API_KEY,
  SMS_SENDER_ID: process.env.SMS_SENDER_ID,
}

const parsed = schema.safeParse(raw)

if (!parsed.success && process.env.NODE_ENV === 'production') {
  console.error('[env] invalid environment configuration:', parsed.error.flatten().fieldErrors)
}

const fallback: ServerEnv = {
  DATABASE_URL: process.env.DATABASE_URL || '',
  AUTH_SECRET: process.env.AUTH_SECRET || 'development-only-secret-change-me-32chars',
  SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'mdmunna26260@gmail.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'KissmeBabu64',
  ADMIN_NAME: process.env.ADMIN_NAME || 'Store Owner',
  STEADFAST_API_KEY: process.env.STEADFAST_API_KEY || '',
  STEADFAST_SECRET_KEY: process.env.STEADFAST_SECRET_KEY || '',
  STEADFAST_BASE_URL: process.env.STEADFAST_BASE_URL || 'https://portal.packzy.com/api/v1',
  FRAUD_API_URL: process.env.FRAUD_API_URL || '',
  FRAUD_API_KEY: process.env.FRAUD_API_KEY || '',
  FRAUDBD_API_KEY: process.env.FRAUDBD_API_KEY || '',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: Number(process.env.SMTP_PORT || 465),
  SMTP_SECURE: process.env.SMTP_SECURE !== 'false',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'RUVIO <no-reply@example.com>',
  META_CONVERSIONS_API_TOKEN: process.env.META_CONVERSIONS_API_TOKEN || '',
  META_TEST_EVENT_CODE: process.env.META_TEST_EVENT_CODE || '',
  SMS_API_URL: process.env.SMS_API_URL || '',
  SMS_API_KEY: process.env.SMS_API_KEY || '',
  SMS_SENDER_ID: process.env.SMS_SENDER_ID || '',
}

export const env: ServerEnv = parsed.success ? (parsed.data as ServerEnv) : fallback

export const publicEnv = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || '',
  ga4MeasurementId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || '',
  gtmId: process.env.NEXT_PUBLIC_GTM_ID || '',
}

export const hasSteadfast = Boolean(env.STEADFAST_API_KEY && env.STEADFAST_SECRET_KEY)
export const hasFraudApi = Boolean(env.FRAUD_API_URL && env.FRAUD_API_KEY)
export const hasSmtp = Boolean(env.SMTP_USER && env.SMTP_PASS)
