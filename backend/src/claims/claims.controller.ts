import {
  Controller,
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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';
import { ClaimsService } from './claims.service';
import { ListClaimsQueryDto } from './dto/list-claims.query.dto';
import { toClaimDto, type ClaimDto } from './mappers/claim.mapper';
import { DistanceOriginQueryDto } from '../common/geo/distance-origin.dto';
import { resolveDistanceOrigin } from '../common/geo/distance-origin';

/** Customer-facing: my bookings/offers (Bookings tab, Profile > My
 * Bookings/My Offers). Claiming itself lives in
 * offer-availabilities.controller.ts since the resource being acted on is
 * the OfferAvailability, not an existing Claim. */
@Controller('claims')
@UseGuards(JwtAuthGuard)
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Get()
  async list(
    @CurrentUser() user: JwtAccessPayload,
    @Query() query: ListClaimsQueryDto,
  ): Promise<ClaimDto[]> {
    const claims = await this.claimsService.listForUser(user.sub, query.status);
    return claims.map((claim) => toClaimDto(claim));
  }

  @Get(':id')
  async get(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() origin: DistanceOriginQueryDto,
  ): Promise<ClaimDto> {
    const claim = await this.claimsService.getForUser(user.sub, id);
    return toClaimDto(claim, resolveDistanceOrigin(origin));
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.claimsService.cancel(user.sub, id);
  }
}
