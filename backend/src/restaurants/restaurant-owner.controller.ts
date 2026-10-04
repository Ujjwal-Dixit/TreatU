import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import type { Restaurant } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';
import { RestaurantsService } from './restaurants.service';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Controller('restaurant-owner/restaurant')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('restaurant_owner')
export class RestaurantOwnerController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  getOwn(@CurrentUser() user: JwtAccessPayload): Promise<Restaurant> {
    return this.restaurantsService.getOwnRestaurant(user.sub);
  }

  @Patch()
  updateOwn(
    @CurrentUser() user: JwtAccessPayload,
    @Body() dto: UpdateRestaurantDto,
  ): Promise<Restaurant> {
    return this.restaurantsService.updateOwnRestaurant(user.sub, dto);
  }
}
