import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { hashSecret, verifySecret } from '../../common/crypto/hash.util';
import { generateOtpCode } from '../../common/crypto/code.util';
import { AppException } from '../../common/exceptions/app.exception';
import { OTP_SENDER, type OtpSender } from './otp-sender.interface';
import type { EnvConfig } from '../../config/env.validation';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OTP_SENDER) private readonly sender: OtpSender,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  private testCodeFor(phoneNumber: string): string | undefined {
    const testNumbers = this.config.get('OTP_TEST_NUMBERS', { infer: true });
    return testNumbers.includes(phoneNumber)
      ? this.config.get('OTP_TEST_CODE', { infer: true })
      : undefined;
  }

  async requestOtp(phoneNumber: string): Promise<void> {
    // Allowlisted test numbers (test servers only — env validation refuses
    // them in production) get the fixed OTP_TEST_CODE and no SMS. The
    // code still goes through the normal hashed row below, so expiry,
    // attempt limits and rate limiting all behave exactly as for real users.
    const testCode = this.testCodeFor(phoneNumber);
    const code = testCode ?? generateOtpCode();
    const codeHash = await hashSecret(code);
    const ttlMinutes = this.config.get('OTP_TTL_MINUTES', { infer: true });

    await this.prisma.otpRequest.create({
      data: {
        phoneNumber,
        codeHash,
        expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
      },
    });

    if (testCode) {
      this.logger.log(`Test number ${phoneNumber}: fixed OTP, no SMS sent`);
      return;
    }

    try {
      await this.sender.send(phoneNumber, code);
    } catch {
      // Delivery genuinely failed (e.g. Twilio unreachable/rejected the
      // number) — surface that to the client rather than returning 204
      // "success" for a code that will never arrive. The OTP row above is
      // still created/left as-is; it simply expires unused, same as any
      // other unconsumed request.
      throw new AppException(
        'OTP_SEND_FAILED',
        "Couldn't send the verification code. Please try again.",
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /** Throws on any failure; returns void on success (the request is
   * consumed so it can't be replayed). */
  async verifyOtp(phoneNumber: string, code: string): Promise<void> {
    const otpRequest = await this.prisma.otpRequest.findFirst({
      where: { phoneNumber, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRequest) {
      throw new AppException(
        'OTP_EXPIRED_OR_NOT_FOUND',
        'This code has expired. Request a new one.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const maxAttempts = this.config.get('OTP_MAX_ATTEMPTS', { infer: true });
    if (otpRequest.attempts >= maxAttempts) {
      throw new AppException(
        'OTP_TOO_MANY_ATTEMPTS',
        'Too many incorrect attempts. Request a new code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const isValid = await verifySecret(code, otpRequest.codeHash);
    if (!isValid) {
      await this.prisma.otpRequest.update({
        where: { id: otpRequest.id },
        data: { attempts: { increment: 1 } },
      });
      throw new AppException(
        'OTP_INCORRECT',
        'That code is incorrect.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.prisma.otpRequest.update({
      where: { id: otpRequest.id },
      data: { consumedAt: new Date() },
    });
  }
}
