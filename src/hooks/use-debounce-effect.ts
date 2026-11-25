import { useEffect, useRef, useState } from 'react';

import type { DependencyList, EffectCallback } from 'react';

import useDebounceFn, { DebounceOptions } from '@/hooks/use-debounce-fn';
import useUpdateEffect from '@/hooks/use-update-effect';

const useDebounceEffect = (effect: EffectCallback, deps?: DependencyList, options?: DebounceOptions) => {
  const [flag, setFlag] = useState({});
  const previousRef = useRef<{ deps?: DependencyList; run: () => void } | undefined>(undefined);

  const { run } = useDebounceFn(() => {
    setFlag({});
  }, options);

  useEffect(() => {
    const previous = previousRef.current;
    const previousDeps = previous?.deps;
    const depsChanged =
      !deps ||
      !previousDeps ||
      deps.length !== previousDeps.length ||
      !deps.every((dependency, index) => Object.is(dependency, previousDeps[index]));

    previousRef.current = { deps: deps && [...deps], run };
    if (depsChanged || previous?.run !== run) {
      run();
    }
  });

  useEffect(
    () => () => {
      previousRef.current = undefined;
    },
    [],
  );

  useUpdateEffect(effect, [flag]);
};

export default useDebounceEffect;
