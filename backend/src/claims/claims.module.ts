import { Module } from '@nestjs/common';
import { ClaimsController } from './claims.controller';
import { OfferAvailabilitiesController } from './offer-availabilities.controller';
import { ClaimsOwnerController } from './claims-owner.controller';
import { ClaimsService } from './claims.service';

@Module({
  controllers: [
    ClaimsController,
    OfferAvailabilitiesController,
    ClaimsOwnerController,
  ],
  providers: [ClaimsService],
})
export class ClaimsModule {}
