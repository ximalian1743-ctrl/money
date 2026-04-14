import { Router } from 'express';
import { z } from 'zod';

import { AiService } from '../services/ai-service.js';

export function createAiRouter(aiService: AiService) {
  const router = Router();

  router.post('/parse-transaction', async (request, response, next) => {
    try {
      const body = z
        .object({
          inputText: z.string().trim().min(1),
          fallbackOccurredAt: z.string().datetime().optional()
        })
        .parse(request.body);

      response.json({
        draft: await aiService.parseTransaction(body.inputText, body.fallbackOccurredAt)
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
