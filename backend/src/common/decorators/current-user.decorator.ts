import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtAccessPayload } from '../../auth/strategies/jwt-access.strategy';

/** Use on routes guarded by JwtAuthGuard, where a user is guaranteed. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtAccessPayload => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: JwtAccessPayload }>();
    return request.user;
  },
);

/** Use on routes guarded by OptionalJwtAuthGuard, where a user may be absent. */
export const CurrentUserOrNull = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtAccessPayload | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: JwtAccessPayload }>();
    return request.user;
  },
);
