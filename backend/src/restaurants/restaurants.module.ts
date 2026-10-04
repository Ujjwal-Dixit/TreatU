import { Module } from '@nestjs/common';
import { OffersModule } from '../offers/offers.module';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantOwnerController } from './restaurant-owner.controller';
import { RestaurantsService } from './restaurants.service';

@Module({
  imports: [OffersModule],
  controllers: [RestaurantsController, RestaurantOwnerController],
  providers: [RestaurantsService],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
