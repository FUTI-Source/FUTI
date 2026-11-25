import { useState } from 'react';

import useLatest from '@/hooks/use-latest';

type AnyFunction = (...args: never[]) => unknown;

type PickFunction<T extends AnyFunction> = (
  this: ThisParameterType<T>,
  ...args: Parameters<T>
) => ReturnType<T>;

const useMemoizedFn = <T extends AnyFunction>(fn: T) => {
  const fnRef = useLatest(fn);

  const [memoizedFn] = useState<PickFunction<T>>(() =>
    function (this: ThisParameterType<T>, ...args: Parameters<T>) {
      return fnRef.current.apply(this, args) as ReturnType<T>;
    },
  );

  return memoizedFn;
};

export default useMemoizedFn;
