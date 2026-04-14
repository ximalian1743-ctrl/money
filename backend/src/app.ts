import type { DatabaseSync } from 'node:sqlite';

import cors from 'cors';
import express from 'express';
import { ZodError } from 'zod';

import { createMemoryDatabase } from './db/database.js';
import { HttpError } from './lib/http-error.js';
import type { FetchLike } from './lib/provider.js';
import { AccountsRepository } from './repositories/accounts-repository.js';
import { SettingsRepository } from './repositories/settings-repository.js';
import { createAiRouter } from './routes/ai.js';
import { createAccountsRouter } from './routes/accounts.js';
import { createSettingsRouter } from './routes/settings.js';
import { createSummaryRouter } from './routes/summary.js';
import { createTransactionsRouter } from './routes/transactions.js';
import { AiService } from './services/ai-service.js';
import { SettingsService } from './services/settings-service.js';
import { SummaryService } from './services/summary-service.js';
import { TransactionService } from './services/transaction-service.js';

interface CreateAppOptions {
  db?: DatabaseSync;
  corsOrigin?: string;
  fetchImpl?: FetchLike;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  const db = options.db ?? createMemoryDatabase();
  const summaryService = new SummaryService(db);
  const transactionService = new TransactionService(db);
  const accountsRepository = new AccountsRepository(db);
  const settingsRepository = new SettingsRepository(db);
  const settingsService = new SettingsService(settingsRepository, options.fetchImpl);
  const aiService = new AiService(db, options.fetchImpl);

  app.use(
    cors({
      origin: options.corsOrigin ?? 'http://localhost:5173',
    }),
  );
  app.use(express.json());

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true });
  });

  app.use('/api/accounts', createAccountsRouter(summaryService, accountsRepository));
  app.use('/api/transactions', createTransactionsRouter(transactionService));
  app.use('/api/summary', createSummaryRouter(summaryService));
  app.use('/api/settings', createSettingsRouter(settingsService));
  app.use('/api/ai', createAiRouter(aiService));

  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
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

      response.status(500).json({ error: '服务器内部错误' });
    },
  );

  return app;
}
