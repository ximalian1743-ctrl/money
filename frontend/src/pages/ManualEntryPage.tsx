import { createTransaction } from '../lib/api';
import { useAppData } from '../hooks/useAppData';
import { useMutationState } from '../hooks/useMutationState';
import type { AccountBalance, CreateTransactionInput } from '../types/api';
import { TransactionForm } from '../components/TransactionForm';

interface ManualEntryPageProps {
  accounts?: AccountBalance[];
  createTransactionImpl?: (input: CreateTransactionInput) => Promise<unknown>;
}

export function ManualEntryPage({
  accounts,
  createTransactionImpl = createTransaction
}: ManualEntryPageProps) {
  const appData = useAppData();
  const { pending, message, setMessage, run } = useMutationState();
  const currentAccounts = accounts ?? appData.accounts;

  async function handleSubmit(input: CreateTransactionInput) {
    await run(async () => {
      await createTransactionImpl(input);
      await appData.reload();
    }, '保存成功');
    setMessage('保存成功');
  }

  return (
    <section className="stack">
      <TransactionForm accounts={currentAccounts} submitLabel={pending ? '保存中...' : '保存记录'} onSubmit={handleSubmit} />
      {message ? <p className="status">{message}</p> : null}
    </section>
  );
}
