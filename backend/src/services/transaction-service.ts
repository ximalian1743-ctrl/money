import type { DatabaseSync } from 'node:sqlite';

import { resolveTransaction } from '../domain/transactions.js';
import type { CreatedTransactionResult, NewTransactionInput } from '../domain/types.js';
import { HttpError } from '../lib/http-error.js';
import { AccountsRepository } from '../repositories/accounts-repository.js';
import { TransactionsRepository } from '../repositories/transactions-repository.js';

export class TransactionService {
  private readonly accountsRepository: AccountsRepository;
  private readonly transactionsRepository: TransactionsRepository;

  constructor(private readonly db: DatabaseSync) {
    this.accountsRepository = new AccountsRepository(db);
    this.transactionsRepository = new TransactionsRepository(db);
  }

  create(input: NewTransactionInput): CreatedTransactionResult {
    const accounts = this.accountsRepository.list();
    const resolved = resolveTransaction(input, accounts);
    const transaction = this.transactionsRepository.create({
      ...input,
      sourceAccountId: resolved.sourceAccountId,
      targetAccountId: resolved.targetAccountId,
    });

    return {
      transaction,
      accountEffects: resolved.accountEffects,
    };
  }

  list() {
    return this.transactionsRepository.listActive();
  }

  delete(id: number): void {
    const deleted = this.transactionsRepository.softDelete(id);
    if (!deleted) {
      throw new HttpError(404, '找不到该流水记录');
    }
  }
}
