import {
  ArrayMaxSize,
  ArrayMinSize,
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
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @Length(1, 30, { each: true })
  cuisines?: string[];

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(4)
  priceTier?: number;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  addressLine?: string;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsUrl(undefined, { each: true })
  galleryUrls?: string[];

  // Validated against editableOperatingHoursSchema (zod) inside
  // RestaurantsService rather than with class-validator decorators — a
  // nested array-of-objects shape reads far more clearly as a zod schema
  // than as decorator chains.
  @IsOptional()
  operatingHours?: unknown;
}
