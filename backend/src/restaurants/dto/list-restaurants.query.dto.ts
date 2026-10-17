import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CATEGORIES } from '../../config/categories.config';
import { DistanceOriginQueryDto } from '../../common/geo/distance-origin.dto';

export class ListRestaurantsQueryDto extends DistanceOriginQueryDto {
  @IsOptional()
  @IsIn(CATEGORIES.map((c) => c.key))
  category?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
