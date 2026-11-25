'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { initCustomCursor } from '@/features/home/custom-cursor';

const EDITABLE_SELECTOR =
  'input, textarea, select, [contenteditable="true"], [contenteditable=""]';
const BLOCKED_PAGE_EVENTS = [
  'copy',
  'cut',
  'paste',
  'contextmenu',
  'selectstart',
  'dragstart',
  'drop',
  'auxclick',
  'dblclick',
  'gesturestart',
  'gesturechange',
  'gestureend',
] as const;

const isEditableTarget = (target: EventTarget | null) =>
  target instanceof Element && target.closest(EDITABLE_SELECTOR) !== null;

/** F11 或 Ctrl/Cmd+Shift+F 切换全屏 */
const isFullscreenShortcut = (event: KeyboardEvent) => {
  // 部分扩展/输入法派发的 keydown 没有 key 字段，直接调用 toLowerCase 会抛错
  const key = event.key?.toLowerCase();
  return key === 'f11' || ((event.ctrlKey || event.metaKey) && event.shiftKey && key === 'f');
};

/** 刷新快捷键：Ctrl/Cmd+R、Ctrl/Cmd+Shift+R、F5、Shift+F5、Ctrl+F5 均拦截为软刷新 */
const isRefreshShortcut = (event: KeyboardEvent) => {
  const key = event.key?.toLowerCase();
  if (key === 'f5') return true;
  return (event.ctrlKey || event.metaKey) && !event.altKey && key === 'r';
};

/** 刷新会丢弃 DOM 全屏，这里记录用户的全屏意图，刷新后据此恢复 */
const FULLSCREEN_INTENT_KEY = 'site:fullscreen';

const readFullscreenIntent = () => {
  try {
    return window.sessionStorage.getItem(FULLSCREEN_INTENT_KEY) === '1';
  } catch {
    return false;
  }
};

const writeFullscreenIntent = (active: boolean) => {
  try {
    if (active) {
      window.sessionStorage.setItem(FULLSCREEN_INTENT_KEY, '1');
    } else {
      window.sessionStorage.removeItem(FULLSCREEN_INTENT_KEY);
    }
  } catch {
    // 隐私模式下 sessionStorage 不可写，全屏意图恢复失效但不影响其他功能
  }
};

const requestFullscreen = () => {
  const root = document.documentElement;
  if (typeof root.requestFullscreen !== 'function') return null;
  return root.requestFullscreen();
};

const toggleFullscreen = () => {
  if (document.fullscreenElement) {
    writeFullscreenIntent(false);
    void document.exitFullscreen().catch(() => {});
    return;
  }

  const pending = requestFullscreen();
  if (!pending) return;
  void pending.then(
    () => writeFullscreenIntent(true),
    () => {},
  );
};

export const SiteInteractionGuard = () => {
  const router = useRouter();
  const routerRef = useRef(router);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    const destroyCustomCursor = initCustomCursor();

    // 刷新后恢复全屏：浏览器会丢掉 DOM 全屏状态，只能靠 sessionStorage 里的意图还原。
    function cleanupRetry() {
      document.removeEventListener('pointerdown', retryWithGesture, true);
      document.removeEventListener('keydown', retryWithGesture, true);
    }

    function retryWithGesture() {
      // 用户已退出全屏或浏览器自行恢复了全屏时无需再试
      if (!readFullscreenIntent() || document.fullscreenElement) {
        cleanupRetry();
        return;
      }

      void requestFullscreen()?.then(
        () => {
          writeFullscreenIntent(true);
          cleanupRetry();
        },
        () => {},
      );
    }

    const restoreFullscreen = () => {
      if (!readFullscreenIntent() || document.fullscreenElement) return;

      const pending = requestFullscreen();
      if (!pending) return;

      void pending.then(
        () => {
          writeFullscreenIntent(true);
        },
        () => {
          // 没有用户手势时浏览器会拒绝自动全屏，等用户下一次交互再补一次
          document.addEventListener('pointerdown', retryWithGesture, true);
          document.addEventListener('keydown', retryWithGesture, true);
        },
      );
    };

    // 刷新时浏览器不会派发 fullscreenchange，因此这里出现的退出一定是用户主动退出（ESC）。
    // 窗口失焦时浏览器同样会退出全屏，但用户多半还会回来，这种情况下保留意图。
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        writeFullscreenIntent(true);
        return;
      }
      if (document.hasFocus()) {
        writeFullscreenIntent(false);
      }
    };

    const preventPageInteraction = (event: Event) => {
      if (!isEditableTarget(event.target)) {
        event.preventDefault();
      }
    };

    // 只放行全屏与刷新快捷键；其余带修饰键或功能键的快捷键一律拦截，输入框内保持正常编辑。
    const handleKeyDown = (event: KeyboardEvent) => {
      // ESC 是用户主动退出全屏的信号，之后的刷新不再自动恢复；
      // 弹窗打开时 ESC 由弹窗消费，全屏意图保持不变。
      if (event.key === 'Escape') {
        if (!document.querySelector('[data-slot="dialog-content"]')) {
          writeFullscreenIntent(false);
          cleanupRetry();
        }
        return;
      }

      if (isFullscreenShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
        toggleFullscreen();
        return;
      }

      // 拦截原生刷新：整页导航会销毁 DOM 全屏，改为不卸载文档的软刷新
      if (isRefreshShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
        routerRef.current.refresh();
        return;
      }

      // Tab 会在页面控件上留下类似标签页的焦点框，全局禁用
      if (event.key === 'Tab') {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (isEditableTarget(event.target)) return;

      const isFunctionKey = /^F\d{1,2}$/.test(event.key);
      const isModifierShortcut = event.ctrlKey || event.metaKey || event.altKey;

      if (isModifierShortcut || isFunctionKey) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    BLOCKED_PAGE_EVENTS.forEach((eventName) => {
      document.addEventListener(eventName, preventPageInteraction, true);
    });
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Ctrl/⌘ + 滚轮与触控板捏合会缩放页面，这里一并拦截；普通滚动不受影响。
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
      }
    };

    // 中键自动滚动属于浏览器自身行为，页面内不需要；链接上的中键新标签页保留。
    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 1) return;
      if (isEditableTarget(event.target)) return;
      if (event.target instanceof Element && event.target.closest('a[href]')) return;
      event.preventDefault();
    };

    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('mousedown', handleMouseDown, true);

    restoreFullscreen();

    return () => {
      BLOCKED_PAGE_EVENTS.forEach((eventName) => {
        document.removeEventListener(eventName, preventPageInteraction, true);
      });
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('mousedown', handleMouseDown, true);
      cleanupRetry();
      destroyCustomCursor();
    };
  }, []);

  return null;
};
