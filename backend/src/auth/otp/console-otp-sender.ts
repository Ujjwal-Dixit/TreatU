import { Injectable, Logger } from '@nestjs/common';
import type { OtpSender } from './otp-sender.interface';

/**
 * INTENTIONALLY MOCKED FOR MVP: logs the OTP instead of sending a real SMS.
 * Selected via OTP_SENDER=console (the default) — see auth.module.ts and
 * env.validation.ts, which is where "never console in production" is
 * actually enforced (at env-validation time, before any provider is
 * instantiated — Nest builds its whole DI graph regardless of which
 * OTP_SENDER ends up selected, so a guard on this class itself would fire
 * even when TwilioOtpSender is the one actually in use).
 */
@Injectable()
export class ConsoleOtpSender implements OtpSender {
  private readonly logger = new Logger(ConsoleOtpSender.name);

  send(phoneNumber: string, code: string): Promise<void> {
    this.logger.warn(`[DEV OTP — no real SMS sent] ${phoneNumber} -> ${code}`);
    return Promise.resolve();
  }
}
