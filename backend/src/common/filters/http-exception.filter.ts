import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger, Injectable } from '@nestjs/common';
import { Request, Response } from 'express';

@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request as any).requestId || request.headers['x-request-id'] || 'n/a';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal Server Error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || exception.message;
        code = (exceptionResponse as any).error || exception.name;
      } else {
        message = exceptionResponse;
        code = exception.name;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
    }

    const responseBody = {
      code,
      message,
      statusCode: status,
      requestId,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(responseBody);
  }
}
