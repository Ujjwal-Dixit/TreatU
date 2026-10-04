import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { JwtAccessPayload } from '../../auth/strategies/jwt-access.strategy';

/** For endpoints like GET /home-feed and GET /restaurants/:id that work
 * logged-out but personalize (isFavorited) when a valid token is present.
 * Never throws on a missing/invalid token — just leaves req.user undefined,
 * which controllers must handle explicitly rather than assuming a user. */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt-access') {
  override handleRequest<TUser = JwtAccessPayload>(
    _err: unknown,
    user: TUser | false,
  ): TUser | undefined {
    return user === false ? undefined : user;
  }
}
