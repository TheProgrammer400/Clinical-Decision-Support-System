import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    const correlationId = (req.headers['x-correlation-id'] as string) || requestId;
    
    req.requestId = requestId;
    req.correlationId = correlationId;
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Correlation-ID', correlationId);

    const { method, url, ip, user } = req;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const latencyMs = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Structured JSON log without PHI or request payload content
        const logPayload = {
          requestId,
          correlationId,
          method,
          url,
          statusCode,
          latencyMs,
          userId: user?.userId || 'anonymous',
          organizationId: user?.organizationId || 'none',
          ip,
        };

        this.logger.log(JSON.stringify(logPayload));
      }),
    );
  }
}
