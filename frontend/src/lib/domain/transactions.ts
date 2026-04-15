import type { AccountEffect, AccountRecord, NewTransactionInput } from './types';

interface ResolvedTransaction {
  sourceAccountId: number | null;
  targetAccountId: number | null;
  accountEffects: AccountEffect[];
}

function requirePositiveAmount(input: NewTransactionInput): void {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('金额必须大于 0');
  }
}

function requireAccount(
  accountsByName: Map<string, AccountRecord>,
  name: string | undefined,
  expectedKinds?: AccountRecord['kind'][],
): AccountRecord {
  if (!name) {
    throw new Error('缺少账户信息');
  }
  const account = accountsByName.get(name);
  if (!account) {
    throw new Error(`找不到账户: ${name}`);
  }
  if (expectedKinds && !expectedKinds.includes(account.kind)) {
    throw new Error(`账户类型不正确: ${name}`);
  }
  return account;
}

export function resolveTransaction(
  input: NewTransactionInput,
  accounts: readonly AccountRecord[],
): ResolvedTransaction {
  requirePositiveAmount(input);
  const accountsByName = new Map(accounts.map((account) => [account.name, account]));

  switch (input.type) {
    case 'expense': {
      const source = requireAccount(accountsByName, input.sourceAccountName, ['asset']);
      return {
        sourceAccountId: source.id,
        targetAccountId: null,
        accountEffects: [effectFor(source, -input.amount)],
      };
    }
    case 'income': {
      const target = requireAccount(accountsByName, input.targetAccountName, ['asset']);
      return {
        sourceAccountId: null,
        targetAccountId: target.id,
        accountEffects: [effectFor(target, input.amount)],
      };
    }
    case 'transfer': {
      const source = requireAccount(accountsByName, input.sourceAccountName, ['asset']);
      const target = requireAccount(accountsByName, input.targetAccountName, ['asset']);
      return {
        sourceAccountId: source.id,
        targetAccountId: target.id,
        accountEffects: [effectFor(source, -input.amount), effectFor(target, input.amount)],
      };
    }
    case 'credit_spending': {
      const target = requireAccount(accountsByName, input.targetAccountName, ['liability']);
      return {
        sourceAccountId: null,
        targetAccountId: target.id,
        accountEffects: [effectFor(target, input.amount)],
      };
    }
    case 'credit_transfer': {
      // Credit card pays for a top-up to an asset account (e.g. transit card).
      // Liability (credit card) debt increases; asset (transit/wallet) balance increases.
      const source = requireAccount(accountsByName, input.sourceAccountName, ['liability']);
      const target = requireAccount(accountsByName, input.targetAccountName, ['asset']);
      return {
        sourceAccountId: source.id,
        targetAccountId: target.id,
        accountEffects: [effectFor(source, input.amount), effectFor(target, input.amount)],
      };
    }
    case 'credit_repayment': {
      const source = requireAccount(accountsByName, input.sourceAccountName, ['asset']);
      const target = requireAccount(accountsByName, input.targetAccountName, ['liability']);
      return {
        sourceAccountId: source.id,
        targetAccountId: target.id,
        accountEffects: [effectFor(source, -input.amount), effectFor(target, -input.amount)],
      };
    }
    default:
      throw new Error(`不支持的交易类型: ${String(input.type)}`);
  }
}

function effectFor(account: AccountRecord, delta: number): AccountEffect {
  return {
    accountId: account.id,
    accountName: account.name,
    delta,
    currency: account.currency,
  };
}
