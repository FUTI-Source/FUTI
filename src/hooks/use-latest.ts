import { useLayoutEffect, useRef } from 'react';

const useLatest = <T>(value: T) => {
  const ref = useRef(value);

  // 在布局阶段同步最新值，保证同一提交中的 effect 和事件回调不会读到旧值。
  useLayoutEffect(() => {
    ref.current = value;
  });

  return ref;
};

export default useLatest;
