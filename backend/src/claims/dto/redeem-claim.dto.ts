import { IsString, Length } from 'class-validator';

export class RedeemClaimDto {
  @IsString()
  @Length(4, 12)
  code!: string;
}
