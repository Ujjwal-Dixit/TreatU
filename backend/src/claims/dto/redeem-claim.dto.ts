import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class RedeemClaimDto {
  @IsString()
  @Length(4, 12)
  code!: string;

  /** Optional so a busy floor can redeem with just the code; when given,
   * it's what the customer's "Total saved" is computed from. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000_000) // ₹10 lakh — guards against a slipped extra zero
  billAmountPaise?: number;
}
