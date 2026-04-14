import type { RequestHandler } from 'express';

export function createRequestLogger(): RequestHandler {
  return (request, response, next) => {
    const startedAt = process.hrtime.bigint();
    response.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const line = JSON.stringify({
        time: new Date().toISOString(),
        method: request.method,
        path: request.originalUrl,
        status: response.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
      });
      console.log(line);
    });
    next();
  };
}
