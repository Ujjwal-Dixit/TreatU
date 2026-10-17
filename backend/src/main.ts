import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import type { EnvConfig } from './config/env.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService<EnvConfig, true>);

  // Behind a hosting proxy, req.ip (what rate limits key on) is the
  // proxy's address unless Express is told to trust its X-Forwarded-For
  // — see TRUST_PROXY_HOPS in env.validation.ts.
  const trustProxyHops = config.get('TRUST_PROXY_HOPS', { infer: true });
  if (trustProxyHops > 0) app.set('trust proxy', trustProxyHops);

  // Health check stays unversioned for load balancers/infra; everything
  // else is under /api/v1 per docs/architecture/api-contracts.md.
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }) });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(config.get('PORT', { infer: true }));
}

void bootstrap();
