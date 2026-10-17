import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../prisma/prisma.service';
import type { EnvConfig } from '../../config/env.validation';
import { verifySecret } from '../../common/crypto/hash.util';
import type { OtpSender } from './otp-sender.interface';
import { OtpService } from './otp.service';

const TEST_NUMBER = '+919800000000';
const TEST_CODE = '424242';

function setup() {
  const created: { codeHash: string }[] = [];
  const prisma = {
    otpRequest: {
      create: jest.fn(({ data }: { data: { codeHash: string } }) => {
        created.push(data);
        return Promise.resolve(data);
      }),
    },
  } as unknown as PrismaService;
  const send = jest.fn<Promise<void>, [phoneNumber: string, code: string]>(() =>
    Promise.resolve(),
  );
  const sender: OtpSender = { send };
  const values: Partial<EnvConfig> = {
    OTP_TTL_MINUTES: 5,
    OTP_TEST_NUMBERS: [TEST_NUMBER],
    OTP_TEST_CODE: TEST_CODE,
  };
  const config = {
    get: (key: keyof EnvConfig) => values[key],
  } as unknown as ConfigService<EnvConfig, true>;

  return { service: new OtpService(prisma, sender, config), send, created };
}

describe('OtpService test numbers', () => {
  it('stores the fixed code and sends no SMS for an allowlisted number', async () => {
    const { service, send, created } = setup();
    await service.requestOtp(TEST_NUMBER);

    expect(send).not.toHaveBeenCalled();
    expect(await verifySecret(TEST_CODE, created[0]!.codeHash)).toBe(true);
  });

  it('sends a random code by SMS for every other number', async () => {
    const { service, send, created } = setup();
    await service.requestOtp('+919811111111');

    expect(send).toHaveBeenCalledTimes(1);
    const [, sentCode] = send.mock.calls[0]!;
    expect(await verifySecret(sentCode, created[0]!.codeHash)).toBe(true);
  });
});
