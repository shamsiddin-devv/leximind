import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../../domain/errors/DomainError';
import { AuthRequest } from '../security';
function databaseCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  if ('code' in error && typeof error.code === 'string') return error.code;
  return 'cause' in error ? databaseCode(error.cause) : undefined;
}
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpError');
  catch(error: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp(),
      res = ctx.getResponse<Response>(),
      req = ctx.getRequest<AuthRequest>();
    let status = 500;
    let message: unknown = 'Internal server error.';
    if (error instanceof DomainError) {
      status = {
        INVALID_INPUT: 400,
        CONFLICT: 409,
        NOT_FOUND: 404,
        UNAUTHORIZED: 401,
        VALIDATION: 422,
        UNAVAILABLE: 503,
      }[error.code];
      message = error.message;
    } else if (error instanceof HttpException) {
      status = error.getStatus();
      const body = error.getResponse();
      message =
        typeof body === 'string'
          ? body
          : 'message' in body
            ? body.message
            : 'Request failed.';
    } else if (
      error &&
      typeof error === 'object' &&
      'type' in error &&
      error.type === 'entity.too.large'
    ) {
      status = 413;
      message = 'Request body exceeds 256 KB.';
    } else {
      const code = databaseCode(error);
      if (code === '23505') {
        status = 409;
        message = 'Resource already exists.';
      } else if (code === '23503' || code === '23001') {
        status = 409;
        message = 'Related resource does not exist or is still in use.';
      } else if (['23514', '22P02', '22001'].includes(code ?? '')) {
        status = 400;
        message = 'Invalid data.';
      } else if (['40001', '40P01'].includes(code ?? '')) {
        status = 409;
        message = 'Concurrent update; retry the request.';
      }
    }
    if (status >= 500)
      this.logger.error({
        requestId: req.requestId,
        message: 'Request failed',
        errorType: error instanceof Error ? error.name : 'UnknownError',
        code: databaseCode(error),
      });
    return res.status(status).json({
      statusCode: status,
      message,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
