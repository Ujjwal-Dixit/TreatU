import { Module } from '@nestjs/common';
import { OfferOwnerController } from './offer-owner.controller';
import { OffersService } from './offers.service';

/** No dependency on RestaurantsModule or ClaimsModule (ownership checks are
 * done via direct Prisma queries in OffersService) so this stays a
 * foundational module other feature modules can import without a cycle. */
@Module({
  controllers: [OfferOwnerController],
  providers: [OffersService],
  exports: [OffersService],
})
export class OffersModule {}
