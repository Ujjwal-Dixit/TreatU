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
  // Test-only login: comma-separated E.164 numbers that log in with the
  // fixed OTP_TEST_CODE instead of a sent SMS, so testers can sign in on a
  // hosted test backend where nobody can read the console sender's output.
  // Refused when NODE_ENV=production (see below).
  OTP_TEST_NUMBERS: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? '')
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean),
    )
    .pipe(
      z.array(
        z
          .string()
          .regex(
            /^\+\d{8,15}$/,
            'OTP_TEST_NUMBERS must be E.164, e.g. +919800000000',
          ),
      ),
    ),
  OTP_TEST_CODE: z
    .string()
    .regex(/^\d{6}$/, 'OTP_TEST_CODE must be 6 digits')
    .optional(),
  // How many reverse proxies sit in front of the app (Render/Railway: 1).
  // Needed so rate limits key on the real client IP — behind a proxy every
  // request otherwise shares the proxy's IP, and the 3/min OTP limit would
  // apply to all users combined. 0 locally: trusting X-Forwarded-For with
  // no proxy in front would let a client spoof its IP past rate limits.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
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

  if (config.OTP_TEST_NUMBERS.length > 0) {
    // A fixed OTP is a known password for those accounts — fine for a
    // test server full of demo data, never for real users.
    if (config.NODE_ENV === 'production') {
      ctx.addIssue({
        code: 'custom',
        path: ['OTP_TEST_NUMBERS'],
        message:
          'OTP_TEST_NUMBERS must not be set when NODE_ENV=production — fixed OTPs are for test servers only.',
      });
    }
    if (!config.OTP_TEST_CODE) {
      ctx.addIssue({
        code: 'custom',
        path: ['OTP_TEST_CODE'],
        message: 'OTP_TEST_CODE is required when OTP_TEST_NUMBERS is set',
      });
    }
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
