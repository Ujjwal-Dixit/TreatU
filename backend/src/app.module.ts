import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OffersModule } from './offers/offers.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { ClaimsModule } from './claims/claims.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // App-wide default; /auth/otp/request carries its own tighter limit
    // (see AuthController) since it's the actual abuse-prone endpoint.
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 60 }] }),
    PrismaModule,
    RealtimeModule,
    AuthModule,
    UsersModule,
    OffersModule,
    RestaurantsModule,
    ClaimsModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
