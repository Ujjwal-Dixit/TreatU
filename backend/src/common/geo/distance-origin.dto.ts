import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsOptional } from 'class-validator';

/** Optional `?lat=&lng=` on discovery endpoints, resolved by
 * resolveDistanceOrigin. Clients send coarse (~1 km) coordinates; nothing
 * is stored. */
export class DistanceOriginQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;
}
