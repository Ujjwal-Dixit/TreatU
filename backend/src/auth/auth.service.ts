import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { hashSecret, verifySecret } from '../common/crypto/hash.util';
import type { EnvConfig } from '../config/env.validation';
import { OtpService } from './otp/otp.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  requestOtp(phoneNumber: string): Promise<void> {
    return this.otpService.requestOtp(phoneNumber);
  }

  /** Verifies the OTP, then finds-or-creates the User by phone number
   * (phone+OTP is the only MVP identity — first successful verification for
   * a number IS signup, there's no separate registration step). */
  async verifyOtpAndLogin(
    phoneNumber: string,
    code: string,
  ): Promise<{ user: User; tokens: AuthTokens }> {
    await this.otpService.verifyOtp(phoneNumber, code);

    const user = await this.prisma.user.upsert({
      where: { phoneNumber },
      update: { lastLoginAt: new Date() },
      create: {
        phoneNumber,
        name: 'New User',
        role: 'customer',
        lastLoginAt: new Date(),
      },
    });

    const tokens = await this.issueTokens(user);
    return { user, tokens };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const { id } = this.parseRefreshToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { id } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }
    const matches = await verifySecret(refreshToken, stored.tokenHash);
    if (!matches) {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    // Rotation: the presented token is single-use. Revoking it here means a
    // replayed/stolen old token fails even if the attacker captured it from
    // a prior legitimate response.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: stored.userId },
    });
    return this.issueTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    const { id } = this.parseRefreshToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role },
      {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }),
      },
    );

    // The refresh token is `${rowId}.${randomSecret}` — the id lets us look
    // up (and revoke) the row without scanning, while only the hash of the
    // full string is stored, so a DB read alone can't forge a valid token.
    const refreshTokenId = randomUUID();
    const secret = randomUUID();
    const refreshToken = `${refreshTokenId}.${secret}`;
    const tokenHash = await hashSecret(refreshToken);
    const refreshTtlDays = this.config.get('JWT_REFRESH_TTL_DAYS', {
      infer: true,
    });

    await this.prisma.refreshToken.create({
      data: {
        id: refreshTokenId,
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private parseRefreshToken(refreshToken: string): { id: string } {
    const [id] = refreshToken.split('.');
    if (!id) {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }
    return { id };
  }
}
