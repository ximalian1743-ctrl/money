import type { DatabaseSync } from 'node:sqlite';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { createMemoryDatabase } from './db/database.js';
import { createErrorHandler } from './lib/error-handler.js';
import type { FetchLike } from './lib/provider.js';
import { createRequestLogger } from './lib/request-logger.js';
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
  enableRateLimit?: boolean;
  enableRequestLogger?: boolean;
  exposeErrorStack?: boolean;
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

  app.disable('x-powered-by');
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: options.corsOrigin ?? 'http://localhost:5173',
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  if (options.enableRequestLogger) {
    app.use(createRequestLogger());
  }

  if (options.enableRateLimit) {
    const general = rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    });
    const aiLimiter = rateLimit({
      windowMs: 60_000,
      limit: 20,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    });
    app.use('/api/', general);
    app.use('/api/ai', aiLimiter);
  }

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true });
  });

  app.use('/api/accounts', createAccountsRouter(summaryService, accountsRepository));
  app.use('/api/transactions', createTransactionsRouter(transactionService));
  app.use('/api/summary', createSummaryRouter(summaryService));
  app.use('/api/settings', createSettingsRouter(settingsService));
  app.use('/api/ai', createAiRouter(aiService));

  app.use(createErrorHandler({ exposeStack: options.exposeErrorStack }));

  return app;
}
