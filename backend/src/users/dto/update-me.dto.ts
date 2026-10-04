import { IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @Length(1, 80)
  name?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
