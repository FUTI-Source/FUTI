'use client';

import { useEffect } from 'react';

import { PAGE_RESTORE_EVENT } from '@/lib/app-events';

/** 恢复信号的最小间隔，避免 visibilitychange 与 pageshow 在同一时刻连发两次 */
const RESTORE_DEBOUNCE_MS = 250;

/**
 * 页面恢复协调器：全站唯一的「用户回到了页面」信号源。
 *
 * 浏览器在后台切回 / 锁屏解锁时可能触发以下任意组合：
 *   - visibilitychange -> visible
 *   - pageshow (persisted=true，bfcache 恢复)
 *   - focus
 * 它们不保证都触发、也不保证顺序。这里统一监听、去重后广播一次
 * PAGE_RESTORE_EVENT，preloader / 头像 / SW 检查等都只认这个信号，
 * 从而消除「各自判断事件顺序」导致的恢复失败与白屏。
 */
export const PageRestoreCoordinator = () => {
  useEffect(() => {
    let wasHidden = document.visibilityState === 'hidden';
    let lastRestoreAt = 0;
    let timer: number | undefined;

    const broadcast = () => {
      const now = performance.now();
      // 多个事件在极短时间内连发时合并为一次
      if (now - lastRestoreAt < RESTORE_DEBOUNCE_MS) {
        if (timer !== undefined) window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          lastRestoreAt = performance.now();
          window.dispatchEvent(new Event(PAGE_RESTORE_EVENT));
        }, RESTORE_DEBOUNCE_MS);
        return;
      }
      lastRestoreAt = now;
      window.dispatchEvent(new Event(PAGE_RESTORE_EVENT));
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wasHidden = true;
        return;
      }
      // 只有确实经历过隐藏才广播，避免页面初次可见就误触发
      if (wasHidden) {
        wasHidden = false;
        broadcast();
      }
    };

    // bfcache 恢复不经过 visibilitychange 的 hidden->visible 转换，需要单独判断
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) broadcast();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  return null;
};
