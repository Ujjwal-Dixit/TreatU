import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp/otp.service';
import { OTP_SENDER, type OtpSender } from './otp/otp-sender.interface';
import { ConsoleOtpSender } from './otp/console-otp-sender';
import { TwilioOtpSender } from './otp/twilio-otp-sender';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import type { EnvConfig } from '../config/env.validation';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: {
          expiresIn: config.get('JWT_ACCESS_TTL', { infer: true }),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    JwtAccessStrategy,
    ConsoleOtpSender,
    TwilioOtpSender,
    // Selected by the OTP_SENDER env var (see env.validation.ts) rather than
    // hardcoded, so switching providers is a config change, not a redeploy.
    // Both concrete providers are still registered above (not
    // conditionally, since Nest resolves the whole graph at boot) — only
    // one of them is ever actually used per the factory below.
    {
      provide: OTP_SENDER,
      useFactory: (
        config: ConfigService<EnvConfig, true>,
        consoleSender: ConsoleOtpSender,
        twilioSender: TwilioOtpSender,
      ): OtpSender =>
        config.get('OTP_SENDER', { infer: true }) === 'twilio'
          ? twilioSender
          : consoleSender,
      inject: [ConfigService, ConsoleOtpSender, TwilioOtpSender],
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
