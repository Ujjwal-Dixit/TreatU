import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** @Global so every feature module gets PrismaService without importing this
 * module explicitly — the DB connection is genuinely app-wide shared state,
 * not something worth re-declaring as a dependency in six module files. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
