import { useState } from 'react';

export function useMutationState() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  async function run<T>(action: () => Promise<T>, successMessage: string): Promise<T> {
    setPending(true);
    setMessage('');

    try {
      const result = await action();
      setMessage(successMessage);
      return result;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '请求失败');
      throw error;
    } finally {
      setPending(false);
    }
  }

  return {
    pending,
    message,
    setMessage,
    run,
  };
}
