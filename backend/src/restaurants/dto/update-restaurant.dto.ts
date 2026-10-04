import {
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRestaurantDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cuisines?: string[];

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(4)
  priceTier?: number;

  @IsOptional()
  @IsString()
  addressLine?: string;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsUrl(undefined, { each: true })
  galleryUrls?: string[];

  // Validated against operatingHoursSchema (zod) inside RestaurantsService
  // rather than with class-validator decorators — a nested array-of-objects
  // shape reads far more clearly as a zod schema than as decorator chains.
  @IsOptional()
  operatingHours?: unknown;
}
