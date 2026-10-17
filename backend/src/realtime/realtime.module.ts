import { Global, Module } from '@nestjs/common';
import { RealtimeController } from './realtime.controller';
import { RealtimeService } from './realtime.service';

/** Global so any feature service can publish without each module wiring
 * an import — publishing is a cross-cutting side effect, like logging. */
@Global()
@Module({
  controllers: [RealtimeController],
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
