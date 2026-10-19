import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

const ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;
const logger = new Logger('HTTP');

/**
 * Assigns a request id (honouring a well-formed incoming X-Request-ID), echoes it in the
 * response, and writes one structured access-log line per request, including failures.
 * Only the path is logged: query strings and bodies may contain clinical text.
 */
export function requestContextMiddleware(req: Request & { requestId?: string; user?: { userId?: string } }, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id');
  const requestId = incoming && ID_PATTERN.test(incoming) ? incoming : randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const latencyMs = Number((process.hrtime.bigint() - start) / 1_000_000n);
    const line = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      latencyMs,
      userId: req.user?.userId ?? null,
    };
    if (res.statusCode >= 500) {
      logger.error(JSON.stringify(line));
    } else if (res.statusCode >= 400) {
      logger.warn(JSON.stringify(line));
    } else {
      logger.log(JSON.stringify(line));
    }
  });
  next();
}
