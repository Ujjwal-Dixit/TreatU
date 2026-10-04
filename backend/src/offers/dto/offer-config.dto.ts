import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import type { OfferStatus } from '@prisma/client';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class OfferConfigDto {
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercentage!: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  daysOfWeek!: number[];

  @Matches(TIME_PATTERN, { message: 'startTime must be HH:mm, 24-hour' })
  startTime!: string;

  @Matches(TIME_PATTERN, { message: 'endTime must be HH:mm, 24-hour' })
  endTime!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minSpendPaise?: number;

  @IsInt()
  @Min(1)
  capacityPerDay!: number;

  @IsOptional()
  @IsIn(['active', 'paused', 'archived'])
  status?: OfferStatus;
}
