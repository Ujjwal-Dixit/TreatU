import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/** What the admin dashboard's "Add restaurant" form sends. City and
 * timezone come from LAUNCH_CITY, and hours start as a default the owner
 * edits in the partner app, so neither is asked for here. */
export class CreateRestaurantDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @Length(1, 30, { each: true })
  cuisines!: string[];

  @Type(() => Number)
  @Min(1)
  @Max(4)
  priceTier!: number;

  @IsString()
  @Length(1, 160)
  streetAddress!: string;

  /** Stored as the last comma-separated part of addressLine, which is the
   * convention every existing restaurant already follows. */
  @IsString()
  @Length(1, 40)
  area!: string;

  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  @IsUrl()
  coverImageUrl!: string;

  /** Links (and if needed creates) the restaurant_owner account that logs
   * in to the partner app. */
  @IsOptional()
  @IsPhoneNumber(undefined, {
    message:
      'Enter the owner phone in international format, e.g. +919876543210.',
  })
  ownerPhoneNumber?: string;
}
