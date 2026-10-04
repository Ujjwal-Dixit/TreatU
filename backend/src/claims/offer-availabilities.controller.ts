import {
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';
import { ClaimsService } from './claims.service';
import { toClaimDto, type ClaimDto } from './mappers/claim.mapper';

@Controller('offer-availabilities')
@UseGuards(JwtAuthGuard)
export class OfferAvailabilitiesController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post(':id/claim')
  async claim(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ClaimDto> {
    const claim = await this.claimsService.claim(user.sub, id);
    return toClaimDto(claim);
  }
}
