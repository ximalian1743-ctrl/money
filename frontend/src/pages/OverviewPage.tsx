import { AccountBalanceList } from '../components/AccountBalanceList';
import { NativeDualCurrencyAmount } from '../components/DualCurrencyAmount';
import { SummaryCard } from '../components/SummaryCard';
import { formatCurrency } from '../lib/format';
import { useAppData } from '../hooks/useAppData';

export function OverviewPage() {
  const { accounts, summary, settings, error, reload } = useAppData();
  const netJpy = summary.assetsInJpy - summary.totalLiabilitiesJpy;

  return (
    <section className="stack">
      {/* Hero: Net Worth */}
      <article className="summary-hero">
        <p className="summary-hero__label">净资产</p>
        <strong className="summary-hero__primary">
          {formatCurrency(summary.actualBalanceCnyBase, 'CNY')}
        </strong>
        <p className="summary-hero__sub">{formatCurrency(netJpy, 'JPY')}</p>
      </article>

      {/* Asset breakdown */}
      <div className="card-grid">
        <SummaryCard
          label="人民币资产"
          value={
            <NativeDualCurrencyAmount
              amount={summary.cnyAssetTotal}
              currency="CNY"
              rates={settings}
            />
          }
        />
        <SummaryCard
          label="日元资产"
          value={
            <NativeDualCurrencyAmount
              amount={summary.jpyAssetTotal}
              currency="JPY"
              rates={settings}
            />
          }
          tone="accent"
        />
      </div>

      {/* Credit card debt — shown only when non-zero */}
      {summary.totalLiabilitiesJpy > 0 ? (
        <SummaryCard
          label="信用卡欠款"
          value={
            <NativeDualCurrencyAmount
              amount={summary.totalLiabilitiesJpy}
              currency="JPY"
              rates={settings}
            />
          }
          tone="danger"
        />
      ) : null}

      {/* Account list */}
      <section className="panel">
        <div className="panel__header">
          <h2>账户余额</h2>
          <p>点击账户可编辑初始余额或信用卡设置。</p>
        </div>
        <AccountBalanceList accounts={accounts} rates={settings} onAccountUpdated={reload} />
      </section>

      {error ? <p className="status status--warning">当前展示的是离线占位数据：{error}</p> : null}
    </section>
  );
}
