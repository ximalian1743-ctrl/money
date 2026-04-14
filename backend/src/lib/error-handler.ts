import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { HttpError } from './http-error.js';

export function createErrorHandler(options: { exposeStack?: boolean } = {}): ErrorRequestHandler {
  const exposeStack = options.exposeStack ?? false;

  return (error, _request, response, _next) => {
    if (error instanceof HttpError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }

    if (error instanceof ZodError) {
      response.status(400).json({
        error: '请求参数无效',
        details: error.flatten(),
      });
      return;
    }

    if (error instanceof SyntaxError && 'body' in error) {
      response.status(400).json({ error: '请求体不是有效的 JSON' });
      return;
    }

    const message = exposeStack && error instanceof Error ? error.message : '服务器内部错误';
    const payload: Record<string, unknown> = { error: message };
    if (exposeStack && error instanceof Error && error.stack) {
      payload.stack = error.stack;
    }
    response.status(500).json(payload);
  };
}
