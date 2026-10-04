import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';
import { UsersService, type UserStats } from './users.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { toUserDto, type UserDto } from './mappers/user.mapper';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getMe(
    @CurrentUser() currentUser: JwtAccessPayload,
  ): Promise<UserDto & { stats: UserStats }> {
    const [user, stats] = await Promise.all([
      this.usersService.getById(currentUser.sub),
      this.usersService.getStats(currentUser.sub),
    ]);
    return { ...toUserDto(user), stats };
  }

  @Patch()
  async updateMe(
    @CurrentUser() currentUser: JwtAccessPayload,
    @Body() dto: UpdateMeDto,
  ): Promise<UserDto> {
    const user = await this.usersService.update(currentUser.sub, dto);
    return toUserDto(user);
  }
}
