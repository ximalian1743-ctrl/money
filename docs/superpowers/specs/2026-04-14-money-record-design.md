# Private Money Record Design

## Overview

This project is a private bookkeeping web application with a mobile-first interface, a formal backend, and AI-assisted transaction parsing. The first version targets local development and single-user usage while keeping the architecture suitable for later deployment.

The product must support:

- Asset tracking across predefined CNY and JPY accounts
- Liability tracking for a PayPay credit card with a fixed limit
- Manual transaction entry
- AI-assisted transaction parsing from short Chinese sentences
- Currency summary in native currency and converted totals
- Persistent storage through a backend database rather than browser-only storage

## Goals

- Build a complete first version under `E:\OpenClawWorkspace\money_record`
- Support local execution with a frontend and backend running together
- Make the UI practical on mobile devices first
- Store bookkeeping data, configuration, and AI settings persistently
- Support OpenAI-compatible API endpoints for both `v1/chat/completions` and `v1/responses`
- Auto-load model lists from `GET /v1/models` after the user enters a compatible endpoint and API key

## Non-Goals

- Multi-user authentication
- Bank synchronization
- OCR from receipts
- Real-time exchange-rate syncing
- Complex budgeting, recurring transactions, or reporting exports

## Product Scope

### Accounts

The first version creates these accounts during database initialization:

- `邮储银行存折` (`asset`, `CNY`)
- `现金纸币` (`asset`, `CNY`)
- `现金硬币` (`asset`, `CNY`)
- `中国银行储蓄卡` (`asset`, `CNY`)
- `微信钱包` (`asset`, `CNY`)
- `交通卡西瓜卡` (`asset`, `JPY`)
- `PayPay 信用卡` (`liability`, `JPY`)

All account balances start at `0`.

`PayPay 信用卡` has a fixed credit limit of `100000 JPY`. The credit limit is informational and must not be counted as an asset. Outstanding credit-card spending is counted as debt and reduces the actual balance.

### Required Summaries

The overview screen must show:

- Total assets
- Total liabilities
- Actual balance = total assets - total liabilities
- Total CNY assets
- Total JPY assets
- Total assets converted to CNY
- Total assets converted to JPY

Converted totals use user-configured exchange rates stored in settings.

### Transaction Types

The first version supports:

- Expense
- Income
- Transfer
- Credit card spending
- Credit card repayment

The accounting effect is defined as follows:

- Expense: decrease an asset account
- Income: increase an asset account
- Transfer: move value from one account to another, possibly across currencies
- Credit card spending: increase liability on `PayPay 信用卡`
- Credit card repayment: decrease an asset account and decrease `PayPay 信用卡` liability

## Technical Architecture

### Frontend

- Stack: `React`, `Vite`, `TypeScript`
- Routing: lightweight client routing for main views
- State: server-backed state with local UI state for forms and previews
- Styling: custom CSS with a mobile-first layout and distinct visual identity

Primary frontend views:

- Overview
- Manual Entry
- AI Entry
- Ledger
- Settings

### Backend

- Stack: `Node.js`, `Express`, `TypeScript`
- Responsibilities:
  - Expose REST APIs for accounts, transactions, summaries, settings, and AI parsing
  - Persist data in SQLite
  - Proxy AI requests to configured OpenAI-compatible providers
  - Normalize responses from `chat/completions` and `responses`
  - Fetch model lists from `/v1/models`

### Database

- Engine: `SQLite`
- Access layer: typed repository or service layer on top of SQL access
- Initialization: automatic schema creation and default account seeding on first startup

This keeps the first version simple to run locally while preserving a clean backend boundary for later migration to a larger database.

## Data Model

### `accounts`

- `id`
- `name`
- `kind` with values `asset` or `liability`
- `currency` with values `CNY` or `JPY`
- `initial_balance`
- `credit_limit`
- `is_system`
- `is_active`
- `created_at`
- `updated_at`

Notes:

- `credit_limit` is only populated for `PayPay 信用卡`
- System accounts are seeded automatically and cannot be deleted in the first version

### `transactions`

- `id`
- `type`
- `title`
- `note`
- `amount`
- `currency`
- `source_account_id`
- `target_account_id`
- `category`
- `occurred_at`
- `created_at`
- `deleted_at`
- `origin` with values `manual` or `ai`
- `ai_input_text`

Notes:

- `source_account_id` and `target_account_id` vary by transaction type
- All balances are derived from account initial balances plus transaction effects

### `settings`

- `id`
- `cny_to_jpy_rate`
- `jpy_to_cny_rate`
- `ai_endpoint_url`
- `ai_api_key`
- `ai_protocol` with values `chat_completions` or `responses`
- `ai_model`
- `updated_at`

Notes:

- The backend stores the API key for single-user usage in the first version
- The settings record is singleton-style and loaded as application configuration

### `ai_parse_logs`

- `id`
- `input_text`
- `parsed_json`
- `raw_response`
- `success`
- `error_message`
- `created_at`

This table provides traceability when a parse fails or returns malformed output.

## API Design

### Accounts

- `GET /api/accounts`
- `PATCH /api/accounts/:id`

`PATCH` only updates safe fields needed in version one, such as initial balance or active status where allowed.

### Transactions

- `GET /api/transactions`
- `POST /api/transactions`
- `DELETE /api/transactions/:id`

The initial version supports deletion for correcting mistakes. Edit support is deferred to keep transaction logic simpler.

### Summaries

- `GET /api/summary`

This endpoint returns:

- per-account computed balance
- total assets
- total liabilities
- actual balance
- CNY asset total
- JPY asset total
- converted totals based on settings

### Settings

- `GET /api/settings`
- `PUT /api/settings`
- `POST /api/settings/test-connection`
- `POST /api/settings/models`

Behavior:

- `test-connection` verifies that the configured endpoint and key are valid enough for the selected protocol
- `models` derives the provider base URL from the configured endpoint and requests `GET /v1/models`

### AI Parsing

- `POST /api/ai/parse-transaction`

Request payload:

- input text
- optional current account list
- optional selected default currency context

Response payload:

- normalized parsed draft
- confidence or parse status
- warnings if fields were inferred

The frontend must require explicit user confirmation before creating a real transaction from an AI draft.

## AI Compatibility Layer

### Supported Endpoint Inputs

The settings screen accepts a full compatible endpoint URL in one of these forms:

- `.../v1/chat/completions`
- `.../v1/responses`

The backend extracts the provider base URL by removing the trailing route and then uses that base URL for model-list requests.

Examples:

- `https://example.com/v1/chat/completions` -> model list URL `https://example.com/v1/models`
- `https://example.com/v1/responses` -> model list URL `https://example.com/v1/models`

### Request Strategy

For `chat/completions`:

- Send a system instruction that defines the bookkeeping schema
- Ask the model to return strict JSON only
- Read the first text content from the completion response

For `responses`:

- Send equivalent instructions in the `responses` format
- Prefer structured output instructions where supported
- Extract the text output and parse it as JSON

### Normalized AI Draft

The backend returns a single normalized structure to the frontend:

- `type`
- `title`
- `amount`
- `currency`
- `account_name`
- `target_account_name`
- `category`
- `occurred_at`
- `note`
- `warnings`

If the AI cannot determine a field safely, the backend should leave the field empty and include a warning rather than inventing silent values.

### Prompt Contract

The prompt must instruct the model to interpret short Chinese sentences such as:

- `午饭38元，用现金纸币`
- `工资到账3000元，进中国银行储蓄卡`
- `便利店 1200 日元，刷 PayPay 信用卡`
- `从微信钱包转 500 元到现金纸币`

The model should map intent into one of the supported transaction types and return valid JSON.

## Balance Computation Rules

Balances are not stored as mutable derived fields. The backend computes them from:

- `initial_balance`
- all non-deleted transactions

Rules:

- Asset balances increase with income to that account
- Asset balances decrease with expenses from that account
- Transfers decrease the source and increase the target
- Liability balances increase with credit spending
- Liability balances decrease with repayment

Summary formulas:

- `total_assets` = sum of all computed asset-account balances before subtracting liabilities
- `total_liabilities` = sum of liability balances
- `actual_balance` = `total_assets - total_liabilities`
- `cny_asset_total` = sum of asset balances where currency is `CNY`
- `jpy_asset_total` = sum of asset balances where currency is `JPY`

Converted totals:

- `assets_in_cny` = `cny_asset_total + (jpy_asset_total * jpy_to_cny_rate)`
- `assets_in_jpy` = `jpy_asset_total + (cny_asset_total * cny_to_jpy_rate)`

Liabilities stay separate and only affect actual balance.

## Frontend UX

### Overview

The overview screen prioritizes readability on narrow mobile screens:

- headline cards for total assets, liabilities, and actual balance
- secondary cards for CNY and JPY totals
- per-account list with current computed balances
- a visible note that `PayPay 信用卡` is debt, not savings

### Manual Entry

The manual entry screen provides:

- transaction type selector
- account selectors that adapt to the chosen type
- amount and currency input
- title and note input
- date and time input
- save action with inline validation

### AI Entry

The AI entry screen provides:

- chat-like input for a Chinese short sentence
- parse button
- loading state
- parsed transaction preview
- warning display when the AI made uncertain inferences
- confirm-save action

### Ledger

The ledger screen provides:

- reverse chronological list
- transaction type filter
- account filter
- delete action for correction

### Settings

The settings screen provides:

- exchange-rate editing
- AI endpoint URL input
- API key input
- protocol selector
- model list load action
- manual model name fallback
- initial balance editing for seeded accounts

## Error Handling

The first version favors explicit failure states over silent fallback.

- If the AI endpoint cannot be reached, the backend returns a descriptive error and the frontend keeps current settings unchanged.
- If `/v1/models` fails, the UI still allows manual model entry.
- If the AI returns malformed JSON, the backend records the raw response and returns a parse error.
- If exchange rates are missing, converted totals display a configuration warning instead of fake values.
- If transaction validation fails, the backend rejects the write and returns field-specific errors.

## Security and Privacy

This is a private single-user application, but the backend still needs basic safeguards:

- The API key is never returned in full after save
- The backend masks saved keys in settings responses where practical
- CORS is configured only for the local frontend origin in development
- No third-party analytics or telemetry are included

The first version does not implement user login because the product is explicitly private and local-first during development.

## Testing Strategy

### Backend

- Unit tests for transaction-to-balance calculation
- Unit tests for exchange-rate conversion summaries
- Unit tests for AI endpoint URL normalization
- Integration tests for account seeding and transaction creation APIs

### Frontend

- Component and flow tests for manual entry validation
- Component and flow tests for AI draft preview and confirmation
- Summary rendering tests for total cards and account lists

### Manual Verification

The project should be runnable locally with:

- backend server
- frontend dev server
- seeded accounts
- ability to save manual transactions
- ability to configure an AI provider
- ability to load model lists

## Project Structure

The first version should be organized as:

- `frontend/`
- `backend/`
- `docs/superpowers/specs/`

Each application keeps its own package manifest and TypeScript configuration to avoid coupling frontend and backend toolchains too early.

## Implementation Notes

- Use a backend service layer to keep accounting rules out of Express route handlers
- Keep frontend form models separate from backend response types where transformation is needed
- Seed system accounts through an idempotent startup routine
- Store times in ISO format and render them in local time on the client
- Prefer explicit enums and schema validation for transaction payloads and AI draft payloads

## Acceptance Criteria

The first version is complete when all of the following are true:

- The application can be started locally and both frontend and backend run successfully
- Default accounts appear automatically with zero balances
- Manual income, expense, transfer, credit spending, and credit repayment all work
- Overview totals update correctly after transactions
- PayPay debt is excluded from total assets and included in liabilities
- Exchange rates can be edited and converted totals update accordingly
- The user can enter an OpenAI-compatible endpoint URL and API key
- The backend can load model lists from `/v1/models`
- The user can select a model and parse a Chinese short sentence into a transaction draft
- The user can confirm the draft and save it into the ledger
