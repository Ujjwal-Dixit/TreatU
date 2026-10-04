import { IsIn, IsOptional } from 'class-validator';
import type { ClaimStatus } from '@prisma/client';

export class ListClaimsQueryDto {
  @IsOptional()
  @IsIn(['claimed', 'redeemed', 'expired', 'cancelled'])
  status?: ClaimStatus;
}
