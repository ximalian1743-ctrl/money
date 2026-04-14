import { Router } from 'express';

import { SummaryService } from '../services/summary-service.js';

export function createSummaryRouter(summaryService: SummaryService) {
  const router = Router();

  router.get('/', (_request, response) => {
    response.json(summaryService.getSummary());
  });

  return router;
}
