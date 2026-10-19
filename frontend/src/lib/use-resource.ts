'use client';

import { useCallback, useEffect, useState } from 'react';

export interface Resource<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
  /** Re-runs the fetcher; resolves when the new data (or error) has been stored. */
  reload: () => Promise<void>;
}

/**
 * Loads data when `key` changes. State is only updated from promise callbacks, results of
 * superseded requests are discarded, and failures are kept as an error, never replaced with
 * placeholder data.
 */
export function useResource<T>(fetcher: () => Promise<T>, key: string): Resource<T> {
  const [state, setState] = useState<{ data: T | null; error: unknown; loading: boolean }>({ data: null, error: null, loading: true });
  const [generation, setGeneration] = useState(0);
  const [waiters] = useState(() => new Set<() => void>());

  useEffect(() => {
    let active = true;
    const settle = () => {
      waiters.forEach((w) => w());
      waiters.clear();
    };
    fetcher().then(
      (data) => {
        if (active) setState({ data, error: null, loading: false });
        settle();
      },
      (error: unknown) => {
        if (active) setState((s) => ({ ...s, error, loading: false }));
        settle();
      },
    );
    return () => {
      active = false;
    };
    // `fetcher` is intentionally excluded: callers pass inline closures; `key` identifies the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, generation]);

  const reload = useCallback(
    () =>
      new Promise<void>((resolve) => {
        waiters.add(resolve);
        setState((s) => ({ ...s, loading: true }));
        setGeneration((g) => g + 1);
      }),
    [waiters],
  );

  return { ...state, reload };
}

export function errorMessage(error: unknown, fallback: string): string | null {
  if (!error) return null;
  return error instanceof Error && error.message ? error.message : fallback;
}
