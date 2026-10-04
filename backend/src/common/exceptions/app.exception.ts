import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Domain-level error with a stable machine-readable `code` the mobile client
 * switches on (e.g. OFFER_SOLD_OUT -> a specific "sold out" UI), separate
 * from the human-readable `message`. See docs/architecture/api-contracts.md
 * for the response shape this produces via AllExceptionsFilter.
 */
export class AppException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, status);
  }
}
