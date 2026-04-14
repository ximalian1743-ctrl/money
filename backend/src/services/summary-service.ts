import type { DatabaseSync } from 'node:sqlite';

import { computeSummary } from '../domain/summary.js';
import type { AccountBalance, TransactionRecord } from '../domain/types.js';
import { AccountsRepository } from '../repositories/accounts-repository.js';
import { SettingsRepository } from '../repositories/settings-repository.js';
import { TransactionsRepository } from '../repositories/transactions-repository.js';

export class SummaryService {
  private readonly accountsRepository: AccountsRepository;
  private readonly settingsRepository: SettingsRepository;
  private readonly transactionsRepository: TransactionsRepository;

  constructor(private readonly db: DatabaseSync) {
    this.accountsRepository = new AccountsRepository(db);
    this.settingsRepository = new SettingsRepository(db);
    this.transactionsRepository = new TransactionsRepository(db);
  }

  getAccountBalances(): AccountBalance[] {
    const accounts = this.accountsRepository.list();
    const transactions = this.transactionsRepository.listActive();
    const balances = new Map<number, AccountBalance>();

    for (const account of accounts) {
      balances.set(account.id, {
        id: account.id,
        name: account.name,
        kind: account.kind,
        currency: account.currency,
        balance: account.initialBalance,
      });
    }

    for (const transaction of transactions) {
      applyTransaction(balances, transaction);
    }

    return [...balances.values()];
  }

  getSummary() {
    return computeSummary(this.getAccountBalances(), this.settingsRepository.get());
  }
}

function adjustBalance(
  balances: Map<number, AccountBalance>,
  accountId: number | null,
  delta: number,
): void {
  if (accountId === null) {
    return;
  }

  const account = balances.get(accountId);
  if (!account) {
    return;
  }

  account.balance += delta;
}

function applyTransaction(
  balances: Map<number, AccountBalance>,
  transaction: TransactionRecord,
): void {
  switch (transaction.type) {
    case 'expense':
      adjustBalance(balances, transaction.sourceAccountId, -transaction.amount);
      break;
    case 'income':
      adjustBalance(balances, transaction.targetAccountId, transaction.amount);
      break;
    case 'transfer':
      adjustBalance(balances, transaction.sourceAccountId, -transaction.amount);
      adjustBalance(balances, transaction.targetAccountId, transaction.amount);
      break;
    case 'credit_spending':
      adjustBalance(balances, transaction.targetAccountId, transaction.amount);
      break;
    case 'credit_repayment':
      adjustBalance(balances, transaction.sourceAccountId, -transaction.amount);
      adjustBalance(balances, transaction.targetAccountId, -transaction.amount);
      break;
  }
}
