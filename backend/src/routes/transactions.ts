import { Router } from 'express';
import { z } from 'zod';

import type { NewTransactionInput } from '../domain/types.js';
import { TransactionService } from '../services/transaction-service.js';

const transactionSchema = z.object({
  type: z.enum(['expense', 'income', 'transfer', 'credit_spending', 'credit_repayment']),
  title: z.string().trim().min(1),
  note: z.string().optional(),
  amount: z.number().positive(),
  currency: z.enum(['CNY', 'JPY']),
  sourceAccountName: z.string().trim().optional(),
  targetAccountName: z.string().trim().optional(),
  category: z.string().trim().optional(),
  occurredAt: z.string().datetime(),
  origin: z.enum(['manual', 'ai']).optional(),
  aiInputText: z.string().optional()
});

export function createTransactionsRouter(transactionService: TransactionService) {
  const router = Router();

  router.get('/', (_request, response) => {
    response.json({ transactions: transactionService.list() });
  });

  router.post('/', (request, response, next) => {
    try {
      const input = transactionSchema.parse(request.body) as NewTransactionInput;
      response.status(201).json(transactionService.create(input));
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', (request, response, next) => {
    try {
      const params = z.object({ id: z.coerce.number().int().positive() }).parse(request.params);
      transactionService.delete(params.id);
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
