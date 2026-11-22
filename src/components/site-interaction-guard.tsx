'use client';

import { useEffect } from 'react';

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

/** 刷新快捷键：Ctrl/Cmd+R、Ctrl/Cmd+Shift+R、F5、Shift+F5、Ctrl+F5 均放行 */
const isRefreshShortcut = (event: KeyboardEvent) => {
  const key = event.key?.toLowerCase();
  if (key === 'f5') return true;
  return (event.ctrlKey || event.metaKey) && !event.altKey && key === 'r';
};

const toggleFullscreen = () => {
  if (document.fullscreenElement) {
    void document.exitFullscreen().catch(() => {});
    return;
  }

  const root = document.documentElement;
  if (typeof root.requestFullscreen !== 'function') return;
  void root.requestFullscreen().catch(() => {});
};

export const SiteInteractionGuard = () => {
  useEffect(() => {
    const preventPageInteraction = (event: Event) => {
      if (!isEditableTarget(event.target)) {
        event.preventDefault();
      }
    };

    // 只放行全屏与刷新快捷键；其余带修饰键或功能键的快捷键一律拦截，输入框内保持正常编辑。
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isFullscreenShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
        toggleFullscreen();
        return;
      }

      // 刷新交给浏览器原生处理，不做拦截
      if (isRefreshShortcut(event)) return;

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

    return () => {
      BLOCKED_PAGE_EVENTS.forEach((eventName) => {
        document.removeEventListener(eventName, preventPageInteraction, true);
      });
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('mousedown', handleMouseDown, true);
    };
  }, []);

  return null;
};
