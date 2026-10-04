import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';
import { ClaimsService } from './claims.service';
import { RedeemClaimDto } from './dto/redeem-claim.dto';
import { toClaimDto, type ClaimDto } from './mappers/claim.mapper';

@Controller('restaurant-owner')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('restaurant_owner')
export class ClaimsOwnerController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Get('offers/:offerId/claims')
  async listForOffer(
    @CurrentUser() user: JwtAccessPayload,
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @Query('date') date?: string,
  ): Promise<ClaimDto[]> {
    const claims = await this.claimsService.listForOwnerOffer(
      user.sub,
      offerId,
      date,
    );
    return claims.map(toClaimDto);
  }

  @Post('claims/redeem')
  async redeem(
    @CurrentUser() user: JwtAccessPayload,
    @Body() dto: RedeemClaimDto,
  ): Promise<ClaimDto> {
    const claim = await this.claimsService.redeemByCode(user.sub, dto.code);
    return toClaimDto(claim);
  }
}
