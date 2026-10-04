import { IsPhoneNumber } from 'class-validator';

export class RequestOtpDto {
  @IsPhoneNumber(undefined, {
    message:
      'Enter a valid phone number in international format, e.g. +919876543210.',
  })
  phoneNumber!: string;
}
