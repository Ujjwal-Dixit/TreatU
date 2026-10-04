import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppException } from '../exceptions/app.exception';

interface ErrorResponseBody {
  error: { code: string; message: string; details: Record<string, unknown> };
}

/** Normalizes every thrown error into the { error: { code, message, details } }
 * shape documented in api-contracts.md, so the mobile client has exactly one
 * error shape to parse regardless of where the error originated. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof AppException) {
      const body: ErrorResponseBody = {
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details ?? {},
        },
      };
      response.status(exception.getStatus()).json(body);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const responseBody = exception.getResponse();
      const rawMessage =
        typeof responseBody === 'string'
          ? responseBody
          : ((responseBody as { message?: string | string[] }).message ??
            exception.message);
      const body: ErrorResponseBody = {
        error: {
          code: HttpStatus[status] ?? 'HTTP_ERROR',
          message: Array.isArray(rawMessage)
            ? rawMessage.join(', ')
            : rawMessage,
          details: {},
        },
      };
      response.status(status).json(body);
      return;
    }

    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
    const body: ErrorResponseBody = {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong. Please try again.',
        details: {},
      },
    };
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
