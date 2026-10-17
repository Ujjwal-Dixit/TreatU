import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';
import { OffersService, type OwnerDashboardDto } from './offers.service';
import { CreateOfferDto, UpdateOfferDto } from './dto/offer-config.dto';
import type { OwnerOfferDto } from './mappers/owner-offer.mapper';

@Controller('restaurant-owner')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('restaurant_owner')
export class OfferOwnerController {
  constructor(private readonly offersService: OffersService) {}

  /** Partner app Home: restaurant header, today's customer count, and the
   * currently-active offers with today's claimed/total. */
  @Get('dashboard')
  dashboard(@CurrentUser() user: JwtAccessPayload): Promise<OwnerDashboardDto> {
    return this.offersService.getDashboard(user.sub);
  }

  @Get('offers')
  list(@CurrentUser() user: JwtAccessPayload): Promise<OwnerOfferDto[]> {
    return this.offersService.listForOwner(user.sub);
  }

  @Get('offers/:id')
  get(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id', ParseUUIDPipe) offerId: string,
  ): Promise<OwnerOfferDto> {
    return this.offersService.getForOwner(user.sub, offerId);
  }

  @Post('offers')
  create(
    @CurrentUser() user: JwtAccessPayload,
    @Body() dto: CreateOfferDto,
  ): Promise<OwnerOfferDto> {
    return this.offersService.createForOwner(user.sub, dto);
  }

  @Patch('offers/:id')
  update(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id', ParseUUIDPipe) offerId: string,
    @Body() dto: UpdateOfferDto,
  ): Promise<OwnerOfferDto> {
    return this.offersService.updateForOwner(user.sub, offerId, dto);
  }
}
