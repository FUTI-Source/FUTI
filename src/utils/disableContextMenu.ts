interface ContentProtectionOptions {
  /** 是否仅在生产环境生效（默认 true，本地开发保留调试能力） */
  prodOnly?: boolean;
  /** 是否允许输入框正常使用右键、选中与复制粘贴（默认 true） */
  allowInputs?: boolean;
  /** 是否禁止常见开发者与保存快捷键（F12、Ctrl+S、Ctrl+U 等，默认 true） */
  disableShortcuts?: boolean;
  /** 是否禁止拖拽图片与链接（默认 true） */
  disableDrag?: boolean;
  /** 是否禁止复制与选中文本（默认 true） */
  disableCopy?: boolean;
}

export function initContentProtection(options: ContentProtectionOptions = {}) {
  const {
    prodOnly = true,
    allowInputs = true,
    disableShortcuts = true,
    disableDrag = true,
    disableCopy = true,
  } = options;

  if (typeof window === 'undefined') return;
  if (prodOnly && !import.meta.env.PROD) return;

  const isEditableElement = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    const tagName = target.tagName.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      target.isContentEditable
    );
  };

  // 1. 禁止右键菜单
  const handleContextMenu = (e: MouseEvent) => {
    if (allowInputs && isEditableElement(e.target)) return;
    e.preventDefault();
  };

  // 2. 禁止开发者工具、保存、查看源码及复制快捷键
  const handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;

    if (disableShortcuts) {
      // 禁止 F12
      if (e.key === 'F12') {
        e.preventDefault();
        return;
      }

      // 禁止 Ctrl/Cmd + Shift + I / J / C（打开控制台/审查元素）
      if (isCtrlOrCmd && e.shiftKey && ['i', 'j', 'c'].includes(key)) {
        e.preventDefault();
        return;
      }

      // 禁止 Ctrl/Cmd + U（查看网页源代码）和 Ctrl/Cmd + S（保存网页）
      if (isCtrlOrCmd && ['u', 's'].includes(key)) {
        e.preventDefault();
        return;
      }
    }

    // 禁止 Ctrl/Cmd + C（复制）和 Ctrl/Cmd + X（剪切）和 Ctrl/Cmd + A（全选）
    if (disableCopy && isCtrlOrCmd && ['c', 'x', 'a'].includes(key)) {
      if (allowInputs && isEditableElement(e.target)) return;
      e.preventDefault();
      return;
    }
  };

  // 3. 禁止拖拽图片或元素
  const handleDragStart = (e: DragEvent) => {
    if (!disableDrag) return;
    if (allowInputs && isEditableElement(e.target)) return;
    e.preventDefault();
  };

  // 4. 禁止复制与剪切事件（防止通过浏览器顶部菜单栏点击“编辑 -> 复制”）
  const handleCopyOrCut = (e: ClipboardEvent) => {
    if (!disableCopy) return;
    if (allowInputs && isEditableElement(e.target)) return;
    e.preventDefault();
  };

  // 5. 自动注入禁止选中文本与移动端长按菜单的 CSS
  let styleEl: HTMLStyleElement | null = null;
  if (disableCopy) {
    styleEl = document.createElement('style');
    styleEl.setAttribute('data-content-protection', 'true');
    styleEl.textContent = `
      body {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
      }
      ${
        allowInputs
          ? `
      input, textarea, [contenteditable="true"] {
        -webkit-user-select: text;
        user-select: text;
      }`
          : ''
      }
    `;
    document.head.appendChild(styleEl);
  }

  document.addEventListener('contextmenu', handleContextMenu, true);
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('dragstart', handleDragStart, true);
  document.addEventListener('copy', handleCopyOrCut, true);
  document.addEventListener('cut', handleCopyOrCut, true);

  // 返回清理函数
  return () => {
    document.removeEventListener('contextmenu', handleContextMenu, true);
    document.removeEventListener('keydown', handleKeyDown, true);
    document.removeEventListener('dragstart', handleDragStart, true);
    document.removeEventListener('copy', handleCopyOrCut, true);
    document.removeEventListener('cut', handleCopyOrCut, true);
    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
    }
  };
}
