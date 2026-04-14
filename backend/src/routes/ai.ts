import { Router } from 'express';
import { z } from 'zod';

import type { AiService } from '../services/ai-service.js';

export function createAiRouter(aiService: AiService) {
  const router = Router();

  router.post('/parse-transaction', async (request, response, next) => {
    try {
      const body = z
        .object({
          inputText: z.string().trim().min(1),
          fallbackOccurredAt: z.string().datetime().optional(),
        })
        .parse(request.body);

      response.json({
        draft: await aiService.parseTransaction(body.inputText, body.fallbackOccurredAt),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/parse-receipt', async (request, response, next) => {
    try {
      const body = z
        .object({
          imageDataUrl: z
            .string()
            .trim()
            .regex(/^data:image\/[\w+.-]+;base64,/, '图片必须是 data:image/... 格式'),
          fallbackOccurredAt: z.string().datetime().optional(),
        })
        .parse(request.body);

      response.json({
        draft: await aiService.parseTransactionFromImage(
          body.imageDataUrl,
          body.fallbackOccurredAt,
        ),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
