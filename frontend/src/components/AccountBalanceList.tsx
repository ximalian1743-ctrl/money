import { formatCurrency, type ExchangeRates } from '../lib/format';
import { NativeDualCurrencyAmount } from './DualCurrencyAmount';
import type { AccountBalance } from '../types/api';

interface AccountBalanceListProps {
  accounts: AccountBalance[];
  rates: ExchangeRates;
  onAccountClick?: (accountName: string) => void;
}

export function AccountBalanceList({ accounts, rates, onAccountClick }: AccountBalanceListProps) {
  return (
    <ul className="account-list">
      {accounts.map((account) => {
        const isCredit = account.kind === 'liability';
        const handleClick = onAccountClick ? () => onAccountClick(account.name) : undefined;

        return (
          <li
            key={account.id}
            className={`account-list__item account-list__item--row${isCredit ? ' account-list__item--credit' : ''}${handleClick ? ' account-list__item--clickable' : ''}`}
            onClick={handleClick}
            role={handleClick ? 'button' : undefined}
            tabIndex={handleClick ? 0 : undefined}
            onKeyDown={
              handleClick
                ? (e) => {
                    if (e.key === 'Enter') handleClick();
                  }
                : undefined
            }
          >
            <div className="account-list__row-main">
              <strong className="account-list__name">{account.name}</strong>
              {isCredit ? <span className="account-badge">信用卡</span> : null}
            </div>
            <div className="account-list__row-balance">
              {isCredit && account.balance === 0 ? (
                <span className="account-list__no-debt-compact">
                  无欠款
                  {account.creditLimit > 0
                    ? ` · 额度 ${formatCurrency(account.creditLimit, account.currency)}`
                    : ''}
                </span>
              ) : (
                <NativeDualCurrencyAmount
                  amount={account.balance}
                  currency={account.currency}
                  rates={rates}
                  align="end"
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
