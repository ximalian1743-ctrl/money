import type { ExchangeRates } from '../lib/format';
import { NativeDualCurrencyAmount } from './DualCurrencyAmount';
import type { AccountBalance } from '../types/api';

interface AccountBalanceListProps {
  accounts: AccountBalance[];
  rates: ExchangeRates;
}

export function AccountBalanceList({ accounts, rates }: AccountBalanceListProps) {
  return (
    <ul className="account-list">
      {accounts.map((account) => (
        <li key={account.id} className="account-list__item">
          <div>
            <strong>{account.name}</strong>
            <p>{account.kind === 'liability' ? '欠款账户' : '资产账户'}</p>
          </div>
          <NativeDualCurrencyAmount
            amount={account.balance}
            currency={account.currency}
            rates={rates}
            align="end"
          />
        </li>
      ))}
    </ul>
  );
}
