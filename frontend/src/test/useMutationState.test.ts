import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { useMutationState } from '../hooks/useMutationState';

describe('useMutationState', () => {
  test('returns idle state by default', () => {
    const { result } = renderHook(() => useMutationState());
    expect(result.current.pending).toBe(false);
    expect(result.current.message).toBe('');
  });

  test('sets pending during the action and sets the success message after it resolves', async () => {
    const { result } = renderHook(() => useMutationState());

    let resolveAction: (value: number) => void = () => {};
    const pending = new Promise<number>((resolve) => {
      resolveAction = resolve;
    });

    let runPromise: Promise<number> | undefined;
    act(() => {
      runPromise = result.current.run(() => pending, '已保存');
    });

    await waitFor(() => expect(result.current.pending).toBe(true));

    await act(async () => {
      resolveAction(42);
      await runPromise;
    });

    expect(result.current.pending).toBe(false);
    expect(result.current.message).toBe('已保存');
  });

  test('reports the error message and re-throws when the action rejects', async () => {
    const { result } = renderHook(() => useMutationState());

    let caught: Error | undefined;
    await act(async () => {
      try {
        await result.current.run(async () => {
          throw new Error('boom');
        }, 'ok');
      } catch (error) {
        caught = error as Error;
      }
    });

    expect(caught?.message).toBe('boom');
    expect(result.current.pending).toBe(false);
    expect(result.current.message).toBe('boom');
  });

  test('setMessage overrides the stored message', () => {
    const { result } = renderHook(() => useMutationState());

    act(() => {
      result.current.setMessage('自定义提示');
    });

    expect(result.current.message).toBe('自定义提示');
  });
});
