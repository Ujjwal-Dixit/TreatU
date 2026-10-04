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
import type { Offer } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';
import { OffersService } from './offers.service';
import { OfferConfigDto } from './dto/offer-config.dto';

@Controller('restaurant-owner/offers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('restaurant_owner')
export class OfferOwnerController {
  constructor(private readonly offersService: OffersService) {}

  @Get()
  list(@CurrentUser() user: JwtAccessPayload): Promise<Offer[]> {
    return this.offersService.listForOwner(user.sub);
  }

  @Post()
  create(
    @CurrentUser() user: JwtAccessPayload,
    @Body() dto: OfferConfigDto,
  ): Promise<Offer> {
    return this.offersService.createForOwner(user.sub, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id', ParseUUIDPipe) offerId: string,
    @Body() dto: Partial<OfferConfigDto>,
  ): Promise<Offer> {
    return this.offersService.updateForOwner(user.sub, offerId, dto);
  }
}
