import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import type { EnvConfig } from '../../config/env.validation';
import type { OtpSender } from './otp-sender.interface';

/**
 * Real SMS delivery via Twilio's Programmable Messaging API — deliberately
 * NOT Twilio Verify. Verify generates and tracks its own OTP codes/expiry/
 * attempts on Twilio's side, which would mean throwing away the OtpService
 * logic already built (code generation, hashing, expiry, attempt limiting,
 * all in our own OtpRequest table). Plain SMS just needs "deliver this
 * text", which is exactly the OtpSender contract.
 *
 * On a Twilio trial account this can only send to a phone number you've
 * verified in the Twilio console — that's a Twilio account restriction,
 * not a bug here. Upgrade the Twilio account (and register for DLT if
 * sending to Indian numbers in production) before relying on this for
 * real users.
 */
@Injectable()
export class TwilioOtpSender implements OtpSender {
  private readonly logger = new Logger(TwilioOtpSender.name);
  private readonly client: Twilio;
  private readonly fromNumber: string;

  constructor(private readonly config: ConfigService<EnvConfig, true>) {
    this.client = new Twilio(
      this.config.get('TWILIO_ACCOUNT_SID', { infer: true }),
      this.config.get('TWILIO_AUTH_TOKEN', { infer: true }),
    );
    this.fromNumber =
      this.config.get('TWILIO_FROM_NUMBER', { infer: true }) ?? '';
  }

  async send(phoneNumber: string, code: string): Promise<void> {
    try {
      await this.client.messages.create({
        to: phoneNumber,
        from: this.fromNumber,
        body: `Your verification code is ${code}. It expires in ${this.config.get('OTP_TTL_MINUTES', { infer: true })} minutes.`,
      });
    } catch (error) {
      // Deliberately not exposing Twilio's raw error (can contain account
      // details) to the API caller — logged server-side, and re-thrown as
      // a plain Error; OtpService.requestOtp() is what turns any send()
      // failure into the client-facing OTP_SEND_FAILED AppException.
      this.logger.error(
        `Failed to send OTP SMS to ${phoneNumber}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
