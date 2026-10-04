import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Rejects the request (401) if no valid access token is present. Applied
 * per-controller/route via @UseGuards — there's no global auth guard,
 * because roughly half of the discovery endpoints are intentionally public
 * (see OptionalJwtAuthGuard for the "public but personalized" ones). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt-access') {}
