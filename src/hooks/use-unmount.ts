import { useEffect } from 'react';

import useLatest from '@/hooks/use-latest';

const useUnmount = (fn: () => void) => {
  const fnRef = useLatest(fn);

  useEffect(
    () => () => {
      fnRef.current();
    },
    [fnRef],
  );
};

export default useUnmount;
