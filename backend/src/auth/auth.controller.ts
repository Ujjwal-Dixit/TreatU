import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { toUserDto, type UserDto } from '../users/mappers/user.mapper';

interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/request')
  @HttpCode(HttpStatus.NO_CONTENT)
  // Tighter than the app-wide default — OTP requests are the classic
  // SMS-pumping abuse vector, so this endpoint gets its own stricter limit.
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async requestOtp(@Body() dto: RequestOtpDto): Promise<void> {
    await this.authService.requestOtp(dto.phoneNumber);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
  ): Promise<{ user: UserDto } & AuthTokensDto> {
    const { user, tokens } = await this.authService.verifyOtpAndLogin(
      dto.phoneNumber,
      dto.code,
    );
    return { user: toUserDto(user), ...tokens };
  }

  @Post('token/refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokensDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }
}
