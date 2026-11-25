/* eslint-disable react-hooks/rules-of-hooks */
import { useEffect, useState } from 'react';

import useLatest from '@/hooks/use-latest';

type SubscriptionEventName = string | symbol;
type Subscription<N extends SubscriptionEventName, T = unknown> = (
  eventName: N,
  val?: T,
) => void | Promise<unknown>;

export class EventEmitter<N extends SubscriptionEventName, T = unknown> {
  private subscriptions = new Set<Subscription<N, T>>();

  emit = async (eventName: N, val?: T): Promise<void> => {
    const promises: Promise<unknown>[] = [];

    for (const subscription of this.subscriptions) {
      const result = subscription(eventName, val);
      if (result instanceof Promise) {
        promises.push(result);
      }
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }
  };

  useSubscription = (callback: Subscription<N, T>) => {
    const callbackRef = useLatest(callback);

    useEffect(() => {
      const subscription = async (eventName: N, val?: T) => {
        if (callbackRef.current) {
          return callbackRef.current(eventName, val);
        }
      };
      this.subscriptions.add(subscription);
      return () => {
        this.subscriptions.delete(subscription);
      };
    }, [callbackRef]);
  };
}

const useEventEmitter = <N extends SubscriptionEventName, T = unknown>() => {
  const [emitter] = useState(() => new EventEmitter<N, T>());
  return emitter;
};

export default useEventEmitter;
