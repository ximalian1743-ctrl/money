import type { DatabaseSync } from 'node:sqlite';

import type { AccountRecord } from '../domain/types.js';

function mapAccountRow(row: Record<string, unknown>): AccountRecord {
  return {
    id: Number(row.id),
    name: String(row.name),
    kind: row.kind as AccountRecord['kind'],
    currency: row.currency as AccountRecord['currency'],
    initialBalance: Number(row.initial_balance),
    creditLimit: Number(row.credit_limit),
    isSystem: Boolean(row.is_system),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export class AccountsRepository {
  constructor(private readonly db: DatabaseSync) {}

  list(): AccountRecord[] {
    const statement = this.db.prepare(`
      select id, name, kind, currency, initial_balance, credit_limit, is_system, is_active, created_at, updated_at
      from accounts
      where is_active = 1
      order by id asc
    `);

    return statement.all().map((row) => mapAccountRow(row as Record<string, unknown>));
  }

  getByName(name: string): AccountRecord | null {
    const row = this.db
      .prepare(
        `
        select id, name, kind, currency, initial_balance, credit_limit, is_system, is_active, created_at, updated_at
        from accounts
        where name = ?
      `,
      )
      .get(name) as Record<string, unknown> | undefined;

    return row ? mapAccountRow(row) : null;
  }

  updateInitialBalance(id: number, initialBalance: number): AccountRecord | null {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `
        update accounts
        set initial_balance = ?, updated_at = ?
        where id = ?
      `,
      )
      .run(initialBalance, now, id);

    const row = this.db
      .prepare(
        `
        select id, name, kind, currency, initial_balance, credit_limit, is_system, is_active, created_at, updated_at
        from accounts
        where id = ?
      `,
      )
      .get(id) as Record<string, unknown> | undefined;

    return row ? mapAccountRow(row) : null;
  }
}
