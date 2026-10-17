import { validateEnv } from './env.validation';

const BASE = {
  DATABASE_URL: 'postgresql://localhost/test',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
};

describe('validateEnv — test OTP numbers', () => {
  it('parses a comma-separated allowlist', () => {
    const env = validateEnv({
      ...BASE,
      OTP_TEST_NUMBERS: '+919800000000, +919800000001',
      OTP_TEST_CODE: '424242',
    });
    expect(env.OTP_TEST_NUMBERS).toEqual(['+919800000000', '+919800000001']);
  });

  it('defaults to no test numbers', () => {
    expect(validateEnv(BASE).OTP_TEST_NUMBERS).toEqual([]);
  });

  it('refuses test numbers in production', () => {
    expect(() =>
      validateEnv({
        ...BASE,
        NODE_ENV: 'production',
        OTP_SENDER: 'twilio',
        TWILIO_ACCOUNT_SID: 'x',
        TWILIO_AUTH_TOKEN: 'x',
        TWILIO_FROM_NUMBER: '+10000000000',
        OTP_TEST_NUMBERS: '+919800000000',
        OTP_TEST_CODE: '424242',
      }),
    ).toThrow(/OTP_TEST_NUMBERS must not be set when NODE_ENV=production/);
  });

  it('requires a code when numbers are set', () => {
    expect(() =>
      validateEnv({ ...BASE, OTP_TEST_NUMBERS: '+919800000000' }),
    ).toThrow(/OTP_TEST_CODE is required/);
  });

  it('rejects numbers that are not E.164', () => {
    expect(() =>
      validateEnv({
        ...BASE,
        OTP_TEST_NUMBERS: '9800000000',
        OTP_TEST_CODE: '424242',
      }),
    ).toThrow(/E\.164/);
  });
});
