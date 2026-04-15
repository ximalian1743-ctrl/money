import { formatDateTime, type ExchangeRates } from '../lib/format';
import { NativeDualCurrencyAmount } from './DualCurrencyAmount';
import type { ParsedDraft } from '../types/api';

interface ParsedDraftCardProps {
  draft: ParsedDraft;
  rates: ExchangeRates;
  onConfirm: () => Promise<void>;
}

export function ParsedDraftCard({ draft, rates, onConfirm }: ParsedDraftCardProps) {
  return (
    <section className="panel form-grid">
      <div className="panel__header">
        <h2>解析结果</h2>
        <p>确认无误后再写入正式流水。</p>
      </div>

      <div className="draft-grid">
        <div>
          <span className="draft-grid__label">标题</span>
          <strong>{draft.title}</strong>
        </div>
        <div>
          <span className="draft-grid__label">金额</span>
          <NativeDualCurrencyAmount amount={draft.amount} currency={draft.currency} rates={rates} />
        </div>
        {draft.type === 'transfer' ||
        draft.type === 'credit_transfer' ||
        draft.type === 'credit_repayment' ? (
          <>
            <div>
              <span className="draft-grid__label">
                {draft.type === 'credit_transfer' ? '信用账户（付款）' : '转出账户'}
              </span>
              <strong>{draft.accountName || '待确认'}</strong>
            </div>
            <div>
              <span className="draft-grid__label">
                {draft.type === 'credit_transfer'
                  ? '充值账户（到账）'
                  : draft.type === 'credit_repayment'
                    ? '还款目标'
                    : '转入账户'}
              </span>
              <strong>{draft.targetAccountName || '待确认'}</strong>
            </div>
          </>
        ) : (
          <div>
            <span className="draft-grid__label">账户</span>
            <strong>{draft.accountName || draft.targetAccountName || '待确认'}</strong>
          </div>
        )}
        <div>
          <span className="draft-grid__label">时间</span>
          <strong>{formatDateTime(draft.occurredAt)}</strong>
        </div>
      </div>

      {draft.warnings.length > 0 ? (
        <ul className="warning-list">
          {draft.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      <button type="button" className="button" onClick={() => void onConfirm()}>
        确认入账
      </button>
    </section>
  );
}
