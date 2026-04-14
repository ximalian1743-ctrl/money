import { HttpError } from '../lib/http-error.js';
import type {
  AccountEffect,
  AccountRecord,
  NewTransactionInput
} from './types.js';

interface ResolvedTransaction {
  sourceAccountId: number | null;
  targetAccountId: number | null;
  accountEffects: AccountEffect[];
}

function requirePositiveAmount(input: NewTransactionInput): void {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new HttpError(400, '金额必须大于 0');
  }
}

function requireAccount(
  accountsByName: Map<string, AccountRecord>,
  name: string | undefined,
  expectedKinds?: AccountRecord['kind'][]
): AccountRecord {
  if (!name) {
    throw new HttpError(400, '缺少账户信息');
  }

  const account = accountsByName.get(name);
  if (!account) {
    throw new HttpError(404, `找不到账户: ${name}`);
  }

  if (expectedKinds && !expectedKinds.includes(account.kind)) {
    throw new HttpError(400, `账户类型不正确: ${name}`);
  }

  return account;
}

export function resolveTransaction(
  input: NewTransactionInput,
  accounts: AccountRecord[]
): ResolvedTransaction {
  requirePositiveAmount(input);
  const accountsByName = new Map(accounts.map((account) => [account.name, account]));

  switch (input.type) {
    case 'expense': {
      const source = requireAccount(accountsByName, input.sourceAccountName, ['asset']);
      return {
        sourceAccountId: source.id,
        targetAccountId: null,
        accountEffects: [
          {
            accountId: source.id,
            accountName: source.name,
            delta: -input.amount,
            currency: source.currency
          }
        ]
      };
    }
    case 'income': {
      const target = requireAccount(accountsByName, input.targetAccountName, ['asset']);
      return {
        sourceAccountId: null,
        targetAccountId: target.id,
        accountEffects: [
          {
            accountId: target.id,
            accountName: target.name,
            delta: input.amount,
            currency: target.currency
          }
        ]
      };
    }
    case 'transfer': {
      const source = requireAccount(accountsByName, input.sourceAccountName, ['asset']);
      const target = requireAccount(accountsByName, input.targetAccountName, ['asset']);
      return {
        sourceAccountId: source.id,
        targetAccountId: target.id,
        accountEffects: [
          {
            accountId: source.id,
            accountName: source.name,
            delta: -input.amount,
            currency: source.currency
          },
          {
            accountId: target.id,
            accountName: target.name,
            delta: input.amount,
            currency: target.currency
          }
        ]
      };
    }
    case 'credit_spending': {
      const target = requireAccount(accountsByName, input.targetAccountName, ['liability']);
      return {
        sourceAccountId: null,
        targetAccountId: target.id,
        accountEffects: [
          {
            accountId: target.id,
            accountName: target.name,
            delta: input.amount,
            currency: target.currency
          }
        ]
      };
    }
    case 'credit_repayment': {
      const source = requireAccount(accountsByName, input.sourceAccountName, ['asset']);
      const target = requireAccount(accountsByName, input.targetAccountName, ['liability']);
      return {
        sourceAccountId: source.id,
        targetAccountId: target.id,
        accountEffects: [
          {
            accountId: source.id,
            accountName: source.name,
            delta: -input.amount,
            currency: source.currency
          },
          {
            accountId: target.id,
            accountName: target.name,
            delta: -input.amount,
            currency: target.currency
          }
        ]
      };
    }
    default:
      throw new HttpError(400, `不支持的交易类型: ${String(input.type)}`);
  }
}
