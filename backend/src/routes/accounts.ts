import { Router } from 'express';
import { z } from 'zod';

import { HttpError } from '../lib/http-error.js';
import type { AccountsRepository } from '../repositories/accounts-repository.js';
import type { SummaryService } from '../services/summary-service.js';

export function createAccountsRouter(
  summaryService: SummaryService,
  accountsRepository: AccountsRepository,
) {
  const router = Router();

  router.get('/', (_request, response) => {
    response.json({ accounts: summaryService.getAccountBalances() });
  });

  router.patch('/:id', (request, response, next) => {
    try {
      const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
      const body = z.object({ initialBalance: z.number() }).parse(request.body);

      const account = accountsRepository.updateInitialBalance(params.id, body.initialBalance);
      if (!account) {
        throw new HttpError(404, '找不到账户');
      }

      response.json({ account });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
