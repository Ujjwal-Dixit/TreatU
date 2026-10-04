import { z } from 'zod';

const baseEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().default(30),
  OTP_TTL_MINUTES: z.coerce.number().default(5),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
  CORS_ORIGIN: z.string().default('*'),
  // "console" (default, dev-only — see ConsoleOtpSender) or "twilio" (real
  // SMS). A config switch rather than an env-based if/else scattered in
  // code, so flipping providers is a deploy config change, not a redeploy.
  OTP_SENDER: z.enum(['console', 'twilio']).default('console'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
});

const envSchema = baseEnvSchema.superRefine((config, ctx) => {
  if (config.OTP_SENDER === 'twilio') {
    for (const key of [
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'TWILIO_FROM_NUMBER',
    ] as const) {
      if (!config[key]) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} is required when OTP_SENDER=twilio`,
        });
      }
    }
  }

  // The authoritative "no fake OTP sender in production" check — enforced
  // here (before any provider is instantiated) rather than inside
  // ConsoleOtpSender itself, since Nest builds its whole DI graph
  // regardless of which OTP_SENDER is actually selected: a check on the
  // provider class would fire even when it's registered-but-unused.
  if (config.NODE_ENV === 'production' && config.OTP_SENDER === 'console') {
    ctx.addIssue({
      code: 'custom',
      path: ['OTP_SENDER'],
      message:
        'OTP_SENDER must not be "console" when NODE_ENV=production — configure a real SMS provider.',
    });
  }
});

export type EnvConfig = z.infer<typeof baseEnvSchema>;

/** Passed to ConfigModule.forRoot({ validate }) — fails fast at boot rather
 * than surfacing a confusing runtime error the first time a missing env var
 * is read. */
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(
      `Invalid environment configuration:\n${result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')}`,
    );
  }
  return result.data;
}
