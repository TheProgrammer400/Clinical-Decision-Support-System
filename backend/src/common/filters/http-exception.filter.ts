import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

interface ErrorBody {
  code: string;
  message: string | string[];
  statusCode: number;
  requestId: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

/**
 * Converts every error into a stable JSON shape.
 *
 * 4xx errors keep their (intentional, user-facing) message. 5xx errors are logged with their
 * stack and replaced by a generic message so database, provider and filesystem details never
 * reach the client.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = request.requestId ?? 'n/a';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message: string | string[] = 'An unexpected error occurred. Reference the request id when reporting this issue.';
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        message = (b.message as string | string[]) ?? exception.message;
        code = typeof b.code === 'string' ? b.code : typeof b.error === 'string' ? toCode(b.error) : toCode(exception.name);
        if (b.details && typeof b.details === 'object') {
          details = b.details as Record<string, unknown>;
        }
      } else {
        message = String(body);
        code = toCode(exception.name);
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        code = 'CONFLICT';
        message = 'The request conflicts with an existing record.';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        code = 'NOT_FOUND';
        message = 'Resource not found.';
      }
    }

    if (status >= 500) {
      const err = exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(`[${requestId}] ${request.method} ${request.path} -> ${status}: ${err.message}`, err.stack);
      if (exception instanceof HttpException && status !== HttpStatus.INTERNAL_SERVER_ERROR) {
        // Deliberate 5xx responses (502/503/504) carry a safe, intentional message; keep it.
      } else {
        message = 'An unexpected error occurred. Reference the request id when reporting this issue.';
        code = 'INTERNAL_ERROR';
        details = undefined;
      }
    }

    const body: ErrorBody = { code, message, statusCode: status, requestId, timestamp: new Date().toISOString() };
    if (details) {
      body.details = details;
    }
    response.status(status).json(body);
  }
}

function toCode(name: string): string {
  return name
    .replace(/Exception$/, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/\s+/g, '_')
    .toUpperCase();
}
