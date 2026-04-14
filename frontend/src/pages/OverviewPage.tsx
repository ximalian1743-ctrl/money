import { AccountBalanceList } from '../components/AccountBalanceList';
import { DualCurrencyAmount } from '../components/DualCurrencyAmount';
import { SummaryCard } from '../components/SummaryCard';
import { useAppData } from '../hooks/useAppData';

export function OverviewPage() {
  const { accounts, summary, settings, error } = useAppData();

  return (
    <section className="stack">
      <div className="card-grid">
        <SummaryCard
          label="总存款"
          value={<DualCurrencyAmount cny={summary.assetsInCny} jpy={summary.assetsInJpy} />}
          tone="accent"
        />
        <SummaryCard
          label="总欠款"
          value={
            <DualCurrencyAmount
              cny={summary.totalLiabilitiesCnyBase}
              jpy={summary.totalLiabilitiesJpy}
            />
          }
          tone="danger"
        />
        <SummaryCard
          label="实际余额"
          value={
            <DualCurrencyAmount
              cny={summary.actualBalanceCnyBase}
              jpy={summary.assetsInJpy - summary.totalLiabilitiesJpy}
            />
          }
        />
        <SummaryCard
          label="人民币资产"
          value={
            <DualCurrencyAmount
              cny={summary.cnyAssetTotal}
              jpy={summary.cnyAssetTotal * settings.cnyToJpyRate}
            />
          }
        />
        <SummaryCard
          label="日元资产"
          value={
            <DualCurrencyAmount
              cny={summary.jpyAssetTotal * settings.jpyToCnyRate}
              jpy={summary.jpyAssetTotal}
            />
          }
        />
        <SummaryCard
          label="折算总额"
          value={<DualCurrencyAmount cny={summary.assetsInCny} jpy={summary.assetsInJpy} />}
        />
      </div>

      <section className="panel">
        <div className="panel__header">
          <h2>账户余额</h2>
          <p>PayPay 信用卡只计入欠款，不计入总存款。</p>
        </div>
        <AccountBalanceList accounts={accounts} rates={settings} />
      </section>

      {error ? <p className="status status--warning">当前展示的是离线占位数据：{error}</p> : null}
    </section>
  );
}
