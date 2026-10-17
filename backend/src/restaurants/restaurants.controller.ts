import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserOrNull,
} from '../common/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';
import {
  RestaurantsService,
  type HomeFeedDto,
  type RestaurantListPage,
} from './restaurants.service';
import { ListRestaurantsQueryDto } from './dto/list-restaurants.query.dto';
import { DistanceOriginQueryDto } from '../common/geo/distance-origin.dto';
import { resolveDistanceOrigin } from '../common/geo/distance-origin';
import type {
  RestaurantCardDto,
  RestaurantDetailDto,
} from './mappers/restaurant.mapper';

@Controller()
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get('home-feed')
  @UseGuards(OptionalJwtAuthGuard)
  getHomeFeed(
    @Query() origin: DistanceOriginQueryDto,
    @CurrentUserOrNull() user?: JwtAccessPayload,
  ): Promise<HomeFeedDto> {
    return this.restaurantsService.getHomeFeed(
      resolveDistanceOrigin(origin),
      user?.sub,
    );
  }

  @Get('restaurants')
  @UseGuards(OptionalJwtAuthGuard)
  list(
    @Query() query: ListRestaurantsQueryDto,
    @CurrentUserOrNull() user?: JwtAccessPayload,
  ): Promise<RestaurantListPage> {
    return this.restaurantsService.listRestaurants(
      query,
      resolveDistanceOrigin(query),
      user?.sub,
    );
  }

  @Get('restaurants/:id')
  @UseGuards(OptionalJwtAuthGuard)
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() origin: DistanceOriginQueryDto,
    @CurrentUserOrNull() user?: JwtAccessPayload,
  ): Promise<RestaurantDetailDto> {
    return this.restaurantsService.getRestaurantDetail(
      id,
      resolveDistanceOrigin(origin),
      user?.sub,
    );
  }

  @Post('restaurants/:id/favorite')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async addFavorite(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtAccessPayload,
  ): Promise<void> {
    await this.restaurantsService.addFavorite(user.sub, id);
  }

  @Delete('restaurants/:id/favorite')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFavorite(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtAccessPayload,
  ): Promise<void> {
    await this.restaurantsService.removeFavorite(user.sub, id);
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  listFavorites(
    @CurrentUser() user: JwtAccessPayload,
    @Query() origin: DistanceOriginQueryDto,
  ): Promise<RestaurantCardDto[]> {
    return this.restaurantsService.listFavorites(
      user.sub,
      resolveDistanceOrigin(origin),
    );
  }
}
