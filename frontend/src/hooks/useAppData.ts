import { useEffect, useRef, useState } from 'react';

import { getSettings, getSummary, getTransactions } from '../lib/api';
import type { AccountBalance, PublicSettings, SummaryData, TransactionRecord } from '../types/api';

const fallbackAccounts: AccountBalance[] = [
  {
    id: 1,
    name: '邮储银行存折',
    kind: 'asset',
    currency: 'JPY',
    balance: 0,
    initialBalance: 0,
    creditLimit: 0,
  },
  {
    id: 2,
    name: '现金纸币',
    kind: 'asset',
    currency: 'JPY',
    balance: 0,
    initialBalance: 0,
    creditLimit: 0,
  },
  {
    id: 3,
    name: '现金硬币',
    kind: 'asset',
    currency: 'JPY',
    balance: 0,
    initialBalance: 0,
    creditLimit: 0,
  },
  {
    id: 4,
    name: '中国银行储蓄卡',
    kind: 'asset',
    currency: 'CNY',
    balance: 0,
    initialBalance: 0,
    creditLimit: 0,
  },
  {
    id: 5,
    name: '微信钱包',
    kind: 'asset',
    currency: 'CNY',
    balance: 0,
    initialBalance: 0,
    creditLimit: 0,
  },
  {
    id: 6,
    name: '交通卡西瓜卡',
    kind: 'asset',
    currency: 'JPY',
    balance: 0,
    initialBalance: 0,
    creditLimit: 0,
  },
  {
    id: 7,
    name: 'PayPay 电子钱包',
    kind: 'asset',
    currency: 'JPY',
    balance: 0,
    initialBalance: 0,
    creditLimit: 0,
  },
  {
    id: 8,
    name: 'PayPay 信用卡',
    kind: 'liability',
    currency: 'JPY',
    balance: 0,
    initialBalance: 0,
    creditLimit: 100000,
  },
];

const fallbackSummary: SummaryData = {
  balances: fallbackAccounts,
  cnyAssetTotal: 0,
  jpyAssetTotal: 0,
  assetsInCny: 0,
  assetsInJpy: 0,
  totalAssetsCnyBase: 0,
  totalLiabilitiesJpy: 0,
  totalLiabilitiesCnyBase: 0,
  actualBalanceCnyBase: 0,
};

const fallbackSettings: PublicSettings = {
  cnyToJpyRate: 20,
  jpyToCnyRate: 0.05,
  aiEndpointUrl: '',
  aiProtocol: 'chat_completions',
  aiModel: '',
  hasApiKey: false,
  aiApiKeyMasked: '',
};

export function useAppData() {
  const mountedRef = useRef(true);
  const [accounts, setAccounts] = useState<AccountBalance[]>(fallbackAccounts);
  const [summary, setSummary] = useState<SummaryData>(fallbackSummary);
  const [settings, setSettings] = useState<PublicSettings>(fallbackSettings);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function reload() {
    if (!mountedRef.current) return;
    setLoading(true);
    setError('');

    try {
      const [nextSummary, nextSettings, nextTransactions] = await Promise.all([
        getSummary(),
        getSettings(),
        getTransactions().catch(() => []),
      ]);
      if (!mountedRef.current) return;
      const nextAccounts = nextSummary.balances;
      setAccounts(nextAccounts);
      setSummary(nextSummary);
      setSettings(nextSettings);
      setTransactions(nextTransactions);
    } catch (requestError) {
      if (!mountedRef.current) return;
      setError(requestError instanceof Error ? requestError.message : '数据加载失败');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    void reload();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    accounts,
    summary,
    settings,
    transactions,
    loading,
    error,
    reload,
    setSettings,
  };
}
