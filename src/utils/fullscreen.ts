export async function toggleFullscreen() {
  const doc = document as any;
  const root = document.documentElement as any;

  // 判断当前是否已处于全屏状态
  const isFullscreen = Boolean(
    doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
  );

  try {
    if (!isFullscreen) {
      if (root.requestFullscreen) {
        await root.requestFullscreen();
      } else if (root.webkitRequestFullscreen) {
        await root.webkitRequestFullscreen();
      } else if (root.mozRequestFullScreen) {
        await root.mozRequestFullScreen();
      } else if (root.msRequestFullscreen) {
        await root.msRequestFullscreen();
      }
    } else {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
    }
  } catch (err) {
    console.warn('全屏切换失败:', err);
  }
}

export function initFullscreenShortcut() {
  if (typeof window === 'undefined') return;

  const handleKeyDown = (e: KeyboardEvent) => {
    // 1. 如果焦点在输入框中，不触发全屏
    const target = e.target as HTMLElement | null;
    if (target) {
      const tag = target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target.isContentEditable) {
        return;
      }
    }

    // 2. 防止长按按键连续反复触发
    if (e.repeat) return;

    const key = e.key.toLowerCase();
    const hasModifier = e.ctrlKey || e.metaKey || e.altKey || e.shiftKey;

    // 方式 A：单独按 F 键（排除 Ctrl+F / Cmd+F 等组合键）
    const isSingleF = key === 'f' && !hasModifier;

    // 方式 B：按 Alt + Enter（排除 Ctrl/Cmd/Shift）
    const isAltEnter =
      key === 'enter' && e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;

    if (isSingleF || isAltEnter) {
      e.preventDefault();
      e.stopPropagation();
      toggleFullscreen();
    }
  };

  window.addEventListener('keydown', handleKeyDown, true);

  return () => {
    window.removeEventListener('keydown', handleKeyDown, true);
  };
}
