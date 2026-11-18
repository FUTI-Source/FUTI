import { useCallback, useRef } from 'react';

import useLatest from '@/hooks/use-latest';
import useUnmount from '@/hooks/use-unmount';

type noop = (...args: any[]) => any;

export interface DebounceOptions {
  wait?: number;
  leading?: boolean;
}

const useDebounceFn = <T extends noop>(fn: T, options?: DebounceOptions) => {
  const fnRef = useLatest(fn);

  const wait = options?.wait ?? 1000;

  const timerRef = useRef<number | null>(null);
  const leading = options?.leading;

  const cancel = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const run = useCallback(
    (...args: Parameters<T>) => {
      const callLeading = leading && timerRef.current === null;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);

      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        if (!leading) fnRef.current(...args);
      }, wait);

      if (callLeading) return fnRef.current(...args);
    },
    [fnRef, leading, wait],
  );

  useUnmount(cancel);

  return { run, cancel };
};

export default useDebounceFn;
