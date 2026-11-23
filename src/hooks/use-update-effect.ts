import { useEffect, useRef } from 'react';

import type { DependencyList, EffectCallback } from 'react';

/**
 * 只在依赖更新时触发 effect，首次挂载不执行。
 * （原 create-update-effect 工厂仅此处单一消费，已内联以消除 lib/ui 过度分层）
 */
const useUpdateEffect = (effect: EffectCallback, deps?: DependencyList) => {
  const isMounted = useRef(false);

  // for react-refresh
  useEffect(
    () => () => {
      isMounted.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
    } else {
      return effect();
    }
  }, deps);
};

export default useUpdateEffect;
