import type { DatabaseSync } from 'node:sqlite';

import type { NewTransactionInput, TransactionRecord } from '../domain/types.js';

interface PersistedTransactionInput extends NewTransactionInput {
  sourceAccountId: number | null;
  targetAccountId: number | null;
}

function mapTransactionRow(row: Record<string, unknown>): TransactionRecord {
  return {
    id: Number(row.id),
    type: row.type as TransactionRecord['type'],
    title: String(row.title),
    note: String(row.note),
    amount: Number(row.amount),
    currency: row.currency as TransactionRecord['currency'],
    sourceAccountId: row.source_account_id === null ? null : Number(row.source_account_id),
    targetAccountId: row.target_account_id === null ? null : Number(row.target_account_id),
    sourceAccountName: String(row.source_account_name ?? ''),
    targetAccountName: String(row.target_account_name ?? ''),
    category: String(row.category),
    occurredAt: String(row.occurred_at),
    createdAt: String(row.created_at),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    origin: row.origin as TransactionRecord['origin'],
    aiInputText: String(row.ai_input_text),
  };
}

export class TransactionsRepository {
  constructor(private readonly db: DatabaseSync) {}

  create(input: PersistedTransactionInput): TransactionRecord {
    const now = new Date().toISOString();
    const result = this.db
      .prepare(
        `
        insert into transactions (
          type, title, note, amount, currency, source_account_id, target_account_id,
          category, occurred_at, created_at, origin, ai_input_text
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        input.type,
        input.title,
        input.note ?? '',
        input.amount,
        input.currency,
        input.sourceAccountId,
        input.targetAccountId,
        input.category ?? '',
        input.occurredAt,
        now,
        input.origin ?? 'manual',
        input.aiInputText ?? '',
      );

    const row = this.db
      .prepare(
        `
        select
          t.id, t.type, t.title, t.note, t.amount, t.currency, t.source_account_id, t.target_account_id,
          t.category, t.occurred_at, t.created_at, t.deleted_at, t.origin, t.ai_input_text,
          coalesce(source.name, '') as source_account_name,
          coalesce(target.name, '') as target_account_name
        from transactions t
        left join accounts source on source.id = t.source_account_id
        left join accounts target on target.id = t.target_account_id
        where t.id = ?
      `,
      )
      .get(Number(result.lastInsertRowid)) as Record<string, unknown>;

    return mapTransactionRow(row);
  }

  listActive(): TransactionRecord[] {
    const statement = this.db.prepare(`
      select
        t.id, t.type, t.title, t.note, t.amount, t.currency, t.source_account_id, t.target_account_id,
        t.category, t.occurred_at, t.created_at, t.deleted_at, t.origin, t.ai_input_text,
        coalesce(source.name, '') as source_account_name,
        coalesce(target.name, '') as target_account_name
      from transactions t
      left join accounts source on source.id = t.source_account_id
      left join accounts target on target.id = t.target_account_id
      where t.deleted_at is null
      order by t.occurred_at desc, t.id desc
    `);

    return statement.all().map((row) => mapTransactionRow(row as Record<string, unknown>));
  }

  softDelete(id: number): boolean {
    const result = this.db
      .prepare(
        `
        update transactions
        set deleted_at = ?
        where id = ? and deleted_at is null
      `,
      )
      .run(new Date().toISOString(), id);

    return Number(result.changes) > 0;
  }
}
