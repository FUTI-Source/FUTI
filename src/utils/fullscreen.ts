interface FullscreenShortcutOptions {
  /** 触发按键（默认 'Enter'，配合 Alt 键即 Alt + Enter） */
  key?: string;
  /** 是否需要按住 Alt 键（默认 true） */
  altKey?: boolean;
  /** 是否需要按住 Ctrl/Cmd 键（默认 false） */
  ctrlOrMetaKey?: boolean;
  /** 输入框中是否忽略快捷键（默认 true） */
  ignoreInputs?: boolean;
}

export async function toggleFullscreen(target: HTMLElement = document.documentElement) {
  try {
    if (!document.fullscreenElement) {
      if (target.requestFullscreen) {
        await target.requestFullscreen();
      } else if ((target as any).webkitRequestFullscreen) {
        await (target as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      }
    }
  } catch (err) {
    console.warn('全屏切换失败:', err);
  }
}

export function initFullscreenShortcut(options: FullscreenShortcutOptions = {}) {
  const {
    key = 'Enter',
    altKey = true,
    ctrlOrMetaKey = false,
    ignoreInputs = true,
  } = options;

  if (typeof window === 'undefined') return;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (ignoreInputs && e.target instanceof HTMLElement) {
      const tagName = e.target.tagName.toLowerCase();
      if (
        tagName === 'input' ||
        tagName === 'textarea' ||
        e.target.isContentEditable
      ) {
        return;
      }
    }

    const matchKey = e.key.toLowerCase() === key.toLowerCase();
    const matchAlt = altKey ? e.altKey : !e.altKey;
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    const matchCtrl = ctrlOrMetaKey ? isCtrlOrCmd : !isCtrlOrCmd;

    if (matchKey && matchAlt && matchCtrl && !e.shiftKey) {
      e.preventDefault();
      toggleFullscreen();
    }
  };

  document.addEventListener('keydown', handleKeyDown, true);

  return () => {
    document.removeEventListener('keydown', handleKeyDown, true);
  };
}
