import { useEffect, useRef } from 'react';

import type { DependencyList, EffectCallback } from 'react';

/**
 * 只在依赖更新时触发 effect，首次挂载不执行。
 * （原 create-update-effect 工厂仅此处单一消费，已内联以消除 lib/ui 过度分层）
 */
const useUpdateEffect = (effect: EffectCallback, deps?: DependencyList) => {
  const isMounted = useRef(false);
  const previousDepsRef = useRef<DependencyList | undefined>(undefined);
  const cleanupRef = useRef<ReturnType<EffectCallback>>(undefined);

  // for react-refresh
  useEffect(
    () => () => {
      isMounted.current = false;
      cleanupRef.current?.();
      cleanupRef.current = undefined;
    },
    [],
  );

  useEffect(() => {
    const previousDeps = previousDepsRef.current;
    const depsChanged =
      !deps ||
      !previousDeps ||
      deps.length !== previousDeps.length ||
      !deps.every((dependency, index) => Object.is(dependency, previousDeps[index]));
    previousDepsRef.current = deps && [...deps];

    if (!isMounted.current) {
      isMounted.current = true;
    } else if (depsChanged) {
      cleanupRef.current?.();
      cleanupRef.current = undefined;
      const cleanup = effect();
      if (typeof cleanup === 'function') cleanupRef.current = cleanup;
    }
  });
};

export default useUpdateEffect;
