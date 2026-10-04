import { IsPhoneNumber, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsPhoneNumber(undefined)
  phoneNumber!: string;

  @Length(6, 6, { message: 'code must be a 6-digit OTP' })
  code!: string;
}
