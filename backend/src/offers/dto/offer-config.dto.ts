import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import type { OfferStatus } from '@prisma/client';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * How an offer recurs:
 *  - "today": runs only on the restaurant-local current date (resolved
 *    server-side — the client never sends "today" as a date, since the
 *    backend is the source of truth for restaurant-local time)
 *  - "dateRange": every day from startDate to endDate inclusive
 *  - "weekly": on daysOfWeek, indefinitely (the original MVP shape, still
 *    what the seed data uses)
 */
export const OFFER_AVAILABILITY_KINDS = [
  'today',
  'dateRange',
  'weekly',
] as const;
export type OfferAvailabilityKind = (typeof OFFER_AVAILABILITY_KINDS)[number];

export const OFFER_DESCRIPTION_MAX_LENGTH = 100;

export class CreateOfferDto {
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercentage!: number;

  @Matches(TIME_PATTERN, { message: 'startTime must be HH:mm, 24-hour' })
  startTime!: string;

  @Matches(TIME_PATTERN, { message: 'endTime must be HH:mm, 24-hour' })
  endTime!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minSpendPaise?: number | null;

  /** Sent by the partner app's "Seats per Day" field; falls back to
   * DEFAULT_CAPACITY_PER_DAY for API callers that omit it. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  capacityPerDay?: number;

  @IsOptional()
  @IsString()
  @MaxLength(OFFER_DESCRIPTION_MAX_LENGTH)
  description?: string;

  @IsIn(OFFER_AVAILABILITY_KINDS)
  availability!: OfferAvailabilityKind;

  @ValidateIf((o: CreateOfferDto) => o.availability === 'dateRange')
  @Matches(DATE_PATTERN, { message: 'startDate must be YYYY-MM-DD' })
  startDate?: string;

  @ValidateIf((o: CreateOfferDto) => o.availability === 'dateRange')
  @Matches(DATE_PATTERN, { message: 'endDate must be YYYY-MM-DD' })
  endDate?: string;

  @ValidateIf((o: CreateOfferDto) => o.availability === 'weekly')
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @IsIn(['active', 'paused'])
  status?: Extract<OfferStatus, 'active' | 'paused'>;
}

/**
 * Every field optional. Written out explicitly rather than typed as
 * Partial<CreateOfferDto>: a TS utility type is erased at runtime, so
 * ValidationPipe would see a plain Object and skip validation (and
 * whitelisting) entirely — which previously let an owner PATCH arbitrary
 * columns such as restaurantId straight into prisma.offer.update.
 */
export class UpdateOfferDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercentage?: number;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'startTime must be HH:mm, 24-hour' })
  startTime?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'endTime must be HH:mm, 24-hour' })
  endTime?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minSpendPaise?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  capacityPerDay?: number;

  @IsOptional()
  @IsString()
  @MaxLength(OFFER_DESCRIPTION_MAX_LENGTH)
  description?: string;

  @IsOptional()
  @IsIn(OFFER_AVAILABILITY_KINDS)
  availability?: OfferAvailabilityKind;

  @ValidateIf((o: UpdateOfferDto) => o.availability === 'dateRange')
  @Matches(DATE_PATTERN, { message: 'startDate must be YYYY-MM-DD' })
  startDate?: string;

  @ValidateIf((o: UpdateOfferDto) => o.availability === 'dateRange')
  @Matches(DATE_PATTERN, { message: 'endDate must be YYYY-MM-DD' })
  endDate?: string;

  @ValidateIf((o: UpdateOfferDto) => o.availability === 'weekly')
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @IsIn(['active', 'paused', 'archived'])
  status?: OfferStatus;
}
