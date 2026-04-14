# Money Record Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first private bookkeeping web app with a React frontend, an Express backend, SQLite persistence, and OpenAI-compatible AI parsing for Chinese short sentences.

**Architecture:** Use a two-app repository layout with `frontend/` and `backend/`, orchestrated by a root workspace package. The backend owns SQLite persistence, summary computation, and AI provider compatibility; the frontend focuses on mobile-first workflows for overview, manual entry, AI entry, ledger, and settings.

**Tech Stack:** `Node.js 25`, `TypeScript`, `Express`, `node:sqlite`, `React`, `Vite`, `Vitest`, `Testing Library`, `node:test`

---

## File Structure

### Root files

- Create: `money_record/package.json`
- Create: `money_record/tsconfig.base.json`

### Backend files

- Create: `money_record/backend/package.json`
- Create: `money_record/backend/tsconfig.json`
- Create: `money_record/backend/src/server.ts`
- Create: `money_record/backend/src/app.ts`
- Create: `money_record/backend/src/config.ts`
- Create: `money_record/backend/src/db/schema.ts`
- Create: `money_record/backend/src/db/database.ts`
- Create: `money_record/backend/src/db/seed.ts`
- Create: `money_record/backend/src/domain/types.ts`
- Create: `money_record/backend/src/domain/summary.ts`
- Create: `money_record/backend/src/domain/transactions.ts`
- Create: `money_record/backend/src/domain/ai.ts`
- Create: `money_record/backend/src/repositories/accounts-repository.ts`
- Create: `money_record/backend/src/repositories/transactions-repository.ts`
- Create: `money_record/backend/src/repositories/settings-repository.ts`
- Create: `money_record/backend/src/services/summary-service.ts`
- Create: `money_record/backend/src/services/transaction-service.ts`
- Create: `money_record/backend/src/services/settings-service.ts`
- Create: `money_record/backend/src/services/ai-service.ts`
- Create: `money_record/backend/src/routes/accounts.ts`
- Create: `money_record/backend/src/routes/transactions.ts`
- Create: `money_record/backend/src/routes/settings.ts`
- Create: `money_record/backend/src/routes/summary.ts`
- Create: `money_record/backend/src/routes/ai.ts`
- Create: `money_record/backend/src/lib/provider.ts`
- Create: `money_record/backend/src/lib/http-error.ts`
- Create: `money_record/backend/tests/summary.test.ts`
- Create: `money_record/backend/tests/transaction-service.test.ts`
- Create: `money_record/backend/tests/provider.test.ts`
- Create: `money_record/backend/tests/app.test.ts`

### Frontend files

- Create: `money_record/frontend/package.json`
- Create: `money_record/frontend/tsconfig.json`
- Create: `money_record/frontend/vite.config.ts`
- Create: `money_record/frontend/index.html`
- Create: `money_record/frontend/src/main.tsx`
- Create: `money_record/frontend/src/app/App.tsx`
- Create: `money_record/frontend/src/app/router.tsx`
- Create: `money_record/frontend/src/app/styles.css`
- Create: `money_record/frontend/src/types/api.ts`
- Create: `money_record/frontend/src/lib/api.ts`
- Create: `money_record/frontend/src/lib/format.ts`
- Create: `money_record/frontend/src/components/Layout.tsx`
- Create: `money_record/frontend/src/components/SummaryCard.tsx`
- Create: `money_record/frontend/src/components/TransactionForm.tsx`
- Create: `money_record/frontend/src/components/ParsedDraftCard.tsx`
- Create: `money_record/frontend/src/components/AccountBalanceList.tsx`
- Create: `money_record/frontend/src/pages/OverviewPage.tsx`
- Create: `money_record/frontend/src/pages/ManualEntryPage.tsx`
- Create: `money_record/frontend/src/pages/AiEntryPage.tsx`
- Create: `money_record/frontend/src/pages/LedgerPage.tsx`
- Create: `money_record/frontend/src/pages/SettingsPage.tsx`
- Create: `money_record/frontend/src/hooks/useAppData.ts`
- Create: `money_record/frontend/src/hooks/useMutationState.ts`
- Create: `money_record/frontend/src/test/overview.test.tsx`
- Create: `money_record/frontend/src/test/manual-entry.test.tsx`
- Create: `money_record/frontend/src/test/ai-entry.test.tsx`
- Create: `money_record/frontend/src/test/settings.test.tsx`
- Create: `money_record/frontend/src/test/setup.ts`

### Documentation

- Create: `money_record/README.md`

## Task 1: Scaffold workspace and developer commands

**Files:**
- Create: `money_record/package.json`
- Create: `money_record/tsconfig.base.json`
- Create: `money_record/backend/package.json`
- Create: `money_record/frontend/package.json`

- [ ] **Step 1: Write the failing workspace smoke test expectation**

Document the command that should fail before scaffolding:

```bash
npm run dev
```

Expected: npm exits with `Missing script: "dev"` at repository root.

- [ ] **Step 2: Create root workspace package**

```json
{
  "name": "money-record",
  "private": true,
  "workspaces": [
    "backend",
    "frontend"
  ],
  "scripts": {
    "dev": "concurrently \"npm --workspace backend run dev\" \"npm --workspace frontend run dev\"",
    "build": "npm --workspace backend run build && npm --workspace frontend run build",
    "test": "npm --workspace backend run test && npm --workspace frontend run test"
  },
  "devDependencies": {
    "concurrently": "^9.1.2"
  }
}
```

- [ ] **Step 3: Create shared TypeScript base config**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 4: Create backend and frontend package manifests**

`backend/package.json`

```json
{
  "name": "backend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "test": "node --test --import tsx tests/**/*.test.ts"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^5.1.0",
    "zod": "^3.24.3"
  },
  "devDependencies": {
    "@types/cors": "^2.8.18",
    "@types/express": "^5.0.1",
    "@types/node": "^24.4.0",
    "tsx": "^4.19.3",
    "typescript": "^5.8.3"
  }
}
```

`frontend/package.json`

```json
{
  "name": "frontend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^7.6.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.2.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    "@vitejs/plugin-react": "^5.0.2",
    "jsdom": "^26.1.0",
    "typescript": "^5.8.3",
    "vite": "^7.0.0",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 5: Install dependencies and verify scripts exist**

Run:

```bash
npm install
npm run build
```

Expected: the root workspace resolves packages; `npm run build` still fails because source files do not exist yet, not because scripts are missing.

- [ ] **Step 6: Commit**

```bash
git add money_record/package.json money_record/tsconfig.base.json money_record/backend/package.json money_record/frontend/package.json
git commit -m "chore: scaffold workspace manifests"
```

## Task 2: Build backend domain model and summary logic

**Files:**
- Create: `money_record/backend/tsconfig.json`
- Create: `money_record/backend/src/domain/types.ts`
- Create: `money_record/backend/src/domain/summary.ts`
- Create: `money_record/backend/src/db/schema.ts`
- Create: `money_record/backend/src/db/database.ts`
- Create: `money_record/backend/src/db/seed.ts`
- Create: `money_record/backend/tests/summary.test.ts`

- [ ] **Step 1: Write the failing summary tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSummary } from '../src/domain/summary.js';
import type { AccountBalance, SettingsRecord } from '../src/domain/types.js';

const settings: SettingsRecord = {
  cnyToJpyRate: 20,
  jpyToCnyRate: 0.05,
  aiEndpointUrl: '',
  aiApiKey: '',
  aiProtocol: 'chat_completions',
  aiModel: ''
};

test('computeSummary separates assets and liabilities', () => {
  const balances: AccountBalance[] = [
    { id: 1, name: '现金纸币', kind: 'asset', currency: 'CNY', balance: 100 },
    { id: 2, name: '交通卡西瓜卡', kind: 'asset', currency: 'JPY', balance: 2000 },
    { id: 3, name: 'PayPay 信用卡', kind: 'liability', currency: 'JPY', balance: 5000 }
  ];

  const summary = computeSummary(balances, settings);

  assert.equal(summary.totalAssetsCnyBase, 200);
  assert.equal(summary.totalLiabilitiesJpy, 5000);
  assert.equal(summary.actualBalanceCnyBase, -50);
});

test('computeSummary returns per-currency asset totals', () => {
  const balances: AccountBalance[] = [
    { id: 1, name: '微信钱包', kind: 'asset', currency: 'CNY', balance: 300 },
    { id: 2, name: '交通卡西瓜卡', kind: 'asset', currency: 'JPY', balance: 4000 }
  ];

  const summary = computeSummary(balances, settings);

  assert.equal(summary.cnyAssetTotal, 300);
  assert.equal(summary.jpyAssetTotal, 4000);
  assert.equal(summary.assetsInJpy, 10000);
});
```

- [ ] **Step 2: Run the summary tests to verify failure**

Run:

```bash
npm --workspace backend run test -- tests/summary.test.ts
```

Expected: FAIL with `Cannot find module '../src/domain/summary.js'`.

- [ ] **Step 3: Implement minimal domain types and summary logic**

`backend/src/domain/types.ts`

```ts
export type Currency = 'CNY' | 'JPY';
export type AccountKind = 'asset' | 'liability';
export type TransactionType =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'credit_spending'
  | 'credit_repayment';

export interface AccountBalance {
  id: number;
  name: string;
  kind: AccountKind;
  currency: Currency;
  balance: number;
}

export interface SettingsRecord {
  cnyToJpyRate: number;
  jpyToCnyRate: number;
  aiEndpointUrl: string;
  aiApiKey: string;
  aiProtocol: 'chat_completions' | 'responses';
  aiModel: string;
}
```

`backend/src/domain/summary.ts`

```ts
import type { AccountBalance, SettingsRecord } from './types.js';

export function computeSummary(balances: AccountBalance[], settings: SettingsRecord) {
  const cnyAssetTotal = balances
    .filter((item) => item.kind === 'asset' && item.currency === 'CNY')
    .reduce((sum, item) => sum + item.balance, 0);

  const jpyAssetTotal = balances
    .filter((item) => item.kind === 'asset' && item.currency === 'JPY')
    .reduce((sum, item) => sum + item.balance, 0);

  const totalLiabilitiesJpy = balances
    .filter((item) => item.kind === 'liability')
    .reduce((sum, item) => sum + item.balance, 0);

  const totalAssetsCnyBase = cnyAssetTotal + jpyAssetTotal * settings.jpyToCnyRate;
  const totalLiabilitiesCnyBase = totalLiabilitiesJpy * settings.jpyToCnyRate;

  return {
    balances,
    cnyAssetTotal,
    jpyAssetTotal,
    assetsInCny: totalAssetsCnyBase,
    assetsInJpy: jpyAssetTotal + cnyAssetTotal * settings.cnyToJpyRate,
    totalAssetsCnyBase,
    totalLiabilitiesJpy,
    actualBalanceCnyBase: totalAssetsCnyBase - totalLiabilitiesCnyBase
  };
}
```

- [ ] **Step 4: Add SQLite schema and seed scaffolding**

```ts
export const schemaStatements = [
  `create table if not exists accounts (
    id integer primary key autoincrement,
    name text not null unique,
    kind text not null,
    currency text not null,
    initial_balance real not null default 0,
    credit_limit real not null default 0,
    is_system integer not null default 1,
    is_active integer not null default 1,
    created_at text not null,
    updated_at text not null
  )`,
  `create table if not exists transactions (
    id integer primary key autoincrement,
    type text not null,
    title text not null,
    note text not null default '',
    amount real not null,
    currency text not null,
    source_account_id integer,
    target_account_id integer,
    category text not null default '',
    occurred_at text not null,
    created_at text not null,
    deleted_at text
  )`
];
```

- [ ] **Step 5: Run the tests and keep them green**

Run:

```bash
npm --workspace backend run test -- tests/summary.test.ts
```

Expected: PASS with `2 tests`.

- [ ] **Step 6: Commit**

```bash
git add money_record/backend
git commit -m "feat: add backend summary domain"
```

## Task 3: Implement backend transaction persistence and API routes

**Files:**
- Create: `money_record/backend/src/app.ts`
- Create: `money_record/backend/src/server.ts`
- Create: `money_record/backend/src/repositories/accounts-repository.ts`
- Create: `money_record/backend/src/repositories/transactions-repository.ts`
- Create: `money_record/backend/src/services/transaction-service.ts`
- Create: `money_record/backend/src/services/summary-service.ts`
- Create: `money_record/backend/src/routes/accounts.ts`
- Create: `money_record/backend/src/routes/transactions.ts`
- Create: `money_record/backend/src/routes/summary.ts`
- Create: `money_record/backend/tests/transaction-service.test.ts`
- Create: `money_record/backend/tests/app.test.ts`

- [ ] **Step 1: Write failing transaction service tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryDatabase } from '../src/db/database.js';
import { TransactionService } from '../src/services/transaction-service.js';

test('expense decreases an asset account balance', () => {
  const db = createMemoryDatabase();
  const service = new TransactionService(db);

  const result = service.create({
    type: 'expense',
    title: '午饭',
    amount: 38,
    currency: 'CNY',
    sourceAccountName: '现金纸币',
    occurredAt: '2026-04-14T12:00:00.000Z'
  });

  assert.equal(result.accountEffects[0]?.delta, -38);
});
```

- [ ] **Step 2: Write failing app route test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

test('GET /api/accounts returns seeded accounts', async () => {
  const app = createApp();
  const server = app.listen(0);
  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Expected an address object');
  }

  const response = await fetch(`http://127.0.0.1:${address.port}/api/accounts`);
  const payload = await response.json();

  server.close();

  assert.equal(response.status, 200);
  assert.equal(payload.accounts.length, 7);
});
```

- [ ] **Step 3: Run backend tests to verify failure**

Run:

```bash
npm --workspace backend run test -- tests/transaction-service.test.ts tests/app.test.ts
```

Expected: FAIL with missing `createMemoryDatabase`, `TransactionService`, or `createApp`.

- [ ] **Step 4: Implement database helpers, repositories, services, and routes**

Key implementation rules:

```ts
// Transaction effect rules
expense => asset delta = -amount
income => asset delta = +amount
transfer => source delta = -amount, target delta = +amount
credit_spending => liability delta = +amount
credit_repayment => asset delta = -amount, liability delta = -amount
```

`createApp()` must register:

```ts
app.use('/api/accounts', accountsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/summary', summaryRouter);
```

`GET /api/accounts` response shape:

```json
{
  "accounts": [
    {
      "id": 1,
      "name": "邮储银行存折",
      "kind": "asset",
      "currency": "CNY",
      "balance": 0
    }
  ]
}
```

- [ ] **Step 5: Re-run backend tests**

Run:

```bash
npm --workspace backend run test -- tests/summary.test.ts tests/transaction-service.test.ts tests/app.test.ts
```

Expected: PASS with all current backend tests green.

- [ ] **Step 6: Commit**

```bash
git add money_record/backend
git commit -m "feat: add transaction and summary api"
```

## Task 4: Implement backend settings and OpenAI-compatible AI integration

**Files:**
- Create: `money_record/backend/src/config.ts`
- Create: `money_record/backend/src/lib/provider.ts`
- Create: `money_record/backend/src/services/settings-service.ts`
- Create: `money_record/backend/src/services/ai-service.ts`
- Create: `money_record/backend/src/routes/settings.ts`
- Create: `money_record/backend/src/routes/ai.ts`
- Create: `money_record/backend/tests/provider.test.ts`

- [ ] **Step 1: Write failing provider normalization tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveModelsUrl, deriveProtocol } from '../src/lib/provider.js';

test('deriveModelsUrl strips chat completions path', () => {
  assert.equal(
    deriveModelsUrl('https://example.com/v1/chat/completions'),
    'https://example.com/v1/models'
  );
});

test('deriveProtocol detects responses endpoint', () => {
  assert.equal(
    deriveProtocol('https://example.com/v1/responses'),
    'responses'
  );
});
```

- [ ] **Step 2: Run provider test to verify failure**

Run:

```bash
npm --workspace backend run test -- tests/provider.test.ts
```

Expected: FAIL with missing provider helpers.

- [ ] **Step 3: Implement provider helpers**

```ts
export function deriveProtocol(endpoint: string) {
  if (endpoint.endsWith('/v1/chat/completions')) {
    return 'chat_completions';
  }
  if (endpoint.endsWith('/v1/responses')) {
    return 'responses';
  }
  throw new Error('Unsupported endpoint URL');
}

export function deriveModelsUrl(endpoint: string) {
  return endpoint
    .replace(/\/v1\/chat\/completions$/, '/v1/models')
    .replace(/\/v1\/responses$/, '/v1/models');
}
```

- [ ] **Step 4: Implement settings and AI routes**

The settings route must support:

```ts
GET /api/settings
PUT /api/settings
POST /api/settings/test-connection
POST /api/settings/models
```

The AI route must support:

```ts
POST /api/ai/parse-transaction
```

AI parse response contract:

```json
{
  "draft": {
    "type": "expense",
    "title": "午饭",
    "amount": 38,
    "currency": "CNY",
    "accountName": "现金纸币",
    "targetAccountName": "",
    "category": "餐饮",
    "occurredAt": "2026-04-14T12:00:00.000Z",
    "note": "",
    "warnings": []
  }
}
```

- [ ] **Step 5: Re-run backend tests**

Run:

```bash
npm --workspace backend run test
```

Expected: PASS. Add one app-level test for `POST /api/settings/models` after the route exists.

- [ ] **Step 6: Commit**

```bash
git add money_record/backend
git commit -m "feat: add ai provider compatibility"
```

## Task 5: Build frontend shell, overview, and settings flows

**Files:**
- Create: `money_record/frontend/tsconfig.json`
- Create: `money_record/frontend/vite.config.ts`
- Create: `money_record/frontend/index.html`
- Create: `money_record/frontend/src/main.tsx`
- Create: `money_record/frontend/src/app/App.tsx`
- Create: `money_record/frontend/src/app/router.tsx`
- Create: `money_record/frontend/src/app/styles.css`
- Create: `money_record/frontend/src/lib/api.ts`
- Create: `money_record/frontend/src/lib/format.ts`
- Create: `money_record/frontend/src/components/Layout.tsx`
- Create: `money_record/frontend/src/components/SummaryCard.tsx`
- Create: `money_record/frontend/src/components/AccountBalanceList.tsx`
- Create: `money_record/frontend/src/pages/OverviewPage.tsx`
- Create: `money_record/frontend/src/pages/SettingsPage.tsx`
- Create: `money_record/frontend/src/hooks/useAppData.ts`
- Create: `money_record/frontend/src/test/setup.ts`
- Create: `money_record/frontend/src/test/overview.test.tsx`
- Create: `money_record/frontend/src/test/settings.test.tsx`

- [ ] **Step 1: Write failing overview rendering test**

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OverviewPage } from '../pages/OverviewPage';

test('renders overview balances and account list', async () => {
  render(
    <MemoryRouter>
      <OverviewPage />
    </MemoryRouter>
  );

  expect(await screen.findByText('总存款')).toBeInTheDocument();
  expect(await screen.findByText('PayPay 信用卡')).toBeInTheDocument();
});
```

- [ ] **Step 2: Write failing settings test**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPage } from '../pages/SettingsPage';

test('loads models after endpoint configuration', async () => {
  const user = userEvent.setup();
  render(<SettingsPage />);

  await user.type(screen.getByLabelText('API 地址'), 'https://example.com/v1/chat/completions');
  await user.click(screen.getByRole('button', { name: '加载模型列表' }));

  expect(await screen.findByText('模型')).toBeInTheDocument();
});
```

- [ ] **Step 3: Run frontend tests to verify failure**

Run:

```bash
npm --workspace frontend run test -- src/test/overview.test.tsx src/test/settings.test.tsx
```

Expected: FAIL with missing page components or missing DOM matchers.

- [ ] **Step 4: Implement app shell and settings UI**

Use a mobile-first navigation shell:

```tsx
<nav>
  <Link to="/">总览</Link>
  <Link to="/manual">记一笔</Link>
  <Link to="/ai">AI 记账</Link>
  <Link to="/ledger">流水</Link>
  <Link to="/settings">设置</Link>
</nav>
```

Overview cards:

```tsx
<SummaryCard label="总存款" value={formatCurrency(summary.assetsInCny, 'CNY')} />
<SummaryCard label="总欠款" value={formatCurrency(summary.totalLiabilitiesJpy, 'JPY')} />
<SummaryCard label="实际余额" value={formatCurrency(summary.actualBalanceCnyBase, 'CNY')} />
```

- [ ] **Step 5: Re-run frontend tests**

Run:

```bash
npm --workspace frontend run test -- src/test/overview.test.tsx src/test/settings.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add money_record/frontend
git commit -m "feat: add overview and settings ui"
```

## Task 6: Implement manual entry, ledger, and AI entry flows

**Files:**
- Create: `money_record/frontend/src/components/TransactionForm.tsx`
- Create: `money_record/frontend/src/components/ParsedDraftCard.tsx`
- Create: `money_record/frontend/src/pages/ManualEntryPage.tsx`
- Create: `money_record/frontend/src/pages/AiEntryPage.tsx`
- Create: `money_record/frontend/src/pages/LedgerPage.tsx`
- Create: `money_record/frontend/src/test/manual-entry.test.tsx`
- Create: `money_record/frontend/src/test/ai-entry.test.tsx`

- [ ] **Step 1: Write failing manual entry test**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManualEntryPage } from '../pages/ManualEntryPage';

test('submits a manual expense', async () => {
  const user = userEvent.setup();
  render(<ManualEntryPage />);

  await user.type(screen.getByLabelText('标题'), '午饭');
  await user.type(screen.getByLabelText('金额'), '38');
  await user.click(screen.getByRole('button', { name: '保存记录' }));

  expect(await screen.findByText('保存成功')).toBeInTheDocument();
});
```

- [ ] **Step 2: Write failing AI entry test**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AiEntryPage } from '../pages/AiEntryPage';

test('parses a Chinese short sentence and shows draft preview', async () => {
  const user = userEvent.setup();
  render(<AiEntryPage />);

  await user.type(screen.getByLabelText('记账内容'), '午饭38元，用现金纸币');
  await user.click(screen.getByRole('button', { name: '解析' }));

  expect(await screen.findByText('解析结果')).toBeInTheDocument();
  expect(await screen.findByText('现金纸币')).toBeInTheDocument();
});
```

- [ ] **Step 3: Run the manual and AI tests to verify failure**

Run:

```bash
npm --workspace frontend run test -- src/test/manual-entry.test.tsx src/test/ai-entry.test.tsx
```

Expected: FAIL with missing pages or missing mutation handlers.

- [ ] **Step 4: Implement the transaction and AI pages**

Manual form fields:

```tsx
<select aria-label="类型" />
<input aria-label="标题" />
<input aria-label="金额" />
<select aria-label="支付账户" />
<button type="submit">保存记录</button>
```

AI flow:

```tsx
<textarea aria-label="记账内容" />
<button type="button">解析</button>
<ParsedDraftCard draft={draft} onConfirm={saveDraft} />
```

Ledger list item shape:

```tsx
<li>
  <strong>{item.title}</strong>
  <span>{item.type}</span>
  <span>{item.amount}</span>
  <button type="button">删除</button>
</li>
```

- [ ] **Step 5: Re-run frontend tests**

Run:

```bash
npm --workspace frontend run test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add money_record/frontend
git commit -m "feat: add transaction entry flows"
```

## Task 7: Final integration, docs, and verification

**Files:**
- Create: `money_record/README.md`
- Modify: `money_record/frontend/src/app/styles.css`
- Modify: `money_record/backend/tests/app.test.ts`

- [ ] **Step 1: Write failing readme expectation**

Run:

```bash
Get-Content README.md
```

Expected: file does not exist.

- [ ] **Step 2: Add README with exact local run instructions**

```md
# Money Record

## Development

```bash
npm install
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:3001`

## Test

```bash
npm test
```
```

- [ ] **Step 3: Run full verification**

Run:

```bash
npm test
npm run build
```

Expected: all backend and frontend tests pass; both applications build successfully.

- [ ] **Step 4: Commit**

```bash
git add money_record
git commit -m "docs: add local run instructions"
```
