interface CustomCursorOptions {
  /** 光斑与小圆点颜色（默认 '#000'，若网页背景偏暗可改为 '#fff'） */
  color?: string;
}

const lerp = (a: number, b: number, n: number) => (1 - n) * a + n * b;

export function initCustomCursor(options: CustomCursorOptions = {}) {
  const { color = '#000' } = options;

  // 服务端渲染或移动端触摸屏设备跳过，避免手机点击残留下小圆点
  if (typeof window === 'undefined' || window.matchMedia('(pointer: coarse)').matches) {
    return;
  }

  // 避免重复初始化
  if (document.getElementById('custom-cursor-dot')) return;

  // 1. 注入与原版完全一致的样式与全局 SVG 小圆点指针
  const styleEl = document.createElement('style');
  styleEl.id = 'custom-cursor-style';
  const encodedColor = encodeURIComponent(color);
  styleEl.textContent = `
    #custom-cursor-dot {
      position: fixed;
      top: 0;
      left: 0;
      width: 16px;
      height: 16px;
      background: ${color};
      border-radius: 8px;
      opacity: 0.25;
      z-index: 10086;
      pointer-events: none;
      transition: 0.2s ease-in-out;
      transition-property: background, opacity, transform;
    }

    #custom-cursor-dot.hidden {
      opacity: 0;
    }

    #custom-cursor-dot.hover {
      opacity: 0.1;
      transform: scale(2.5);
    }

    #custom-cursor-dot.active {
      opacity: 0.5;
      transform: scale(0.5);
    }

    * {
      cursor: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8' width='8px' height='8px'><circle cx='4' cy='4' r='4' fill='${encodedColor}' opacity='.5'/></svg>") 4 4, auto !important;
    }
  `;
  document.head.appendChild(styleEl);

  // 2. 创建平滑跟随的大圆点元素
  const cursor = document.createElement('div');
  cursor.id = 'custom-cursor-dot';
  cursor.classList.add('hidden');
  document.body.appendChild(cursor);

  const pos: {
    curr: { x: number; y: number } | null;
    prev: { x: number; y: number } | null;
  } = { curr: null, prev: null };

  let rafId: number;

  const move = (left: number, top: number) => {
    cursor.style.left = `${left}px`;
    cursor.style.top = `${top}px`;
  };

  // 实时判断鼠标悬停的元素是否为可点击元素（兼容 React 动态渲染与子元素冒泡）
  const isPointerElement = (target: EventTarget | null): boolean => {
    let el = target as HTMLElement | null;
    while (el && el !== document.body) {
      const tag = el.tagName.toLowerCase();
      if (
        tag === 'a' ||
        tag === 'button' ||
        el.getAttribute('role') === 'button' ||
        el.hasAttribute('onclick') ||
        el.classList.contains('cursor-pointer')
      ) {
        return true;
      }
      el = el.parentElement;
    }
    return false;
  };

  const handleMouseOver = (e: MouseEvent) => {
    if (isPointerElement(e.target)) {
      cursor.classList.add('hover');
    } else {
      cursor.classList.remove('hover');
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (pos.curr === null) {
      move(e.clientX - 8, e.clientY - 8);
    }
    pos.curr = { x: e.clientX - 8, y: e.clientY - 8 };
    cursor.classList.remove('hidden');
  };

  const handleMouseEnter = () => cursor.classList.remove('hidden');
  const handleMouseLeave = () => cursor.classList.add('hidden');
  const handleMouseDown = () => cursor.classList.add('active');
  const handleMouseUp = () => cursor.classList.remove('active');

  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mousemove', handleMouseMove, { passive: true });
  document.addEventListener('mouseenter', handleMouseEnter);
  document.addEventListener('mouseleave', handleMouseLeave);
  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mouseup', handleMouseUp);

  // 3. 阻尼插值渲染循环（保持原版 0.15 的跟手丝滑度）
  const render = () => {
    if (pos.prev && pos.curr) {
      pos.prev.x = lerp(pos.prev.x, pos.curr.x, 0.15);
      pos.prev.y = lerp(pos.prev.y, pos.curr.y, 0.15);
      move(pos.prev.x, pos.prev.y);
    } else if (pos.curr) {
      pos.prev = { ...pos.curr };
    }
    rafId = requestAnimationFrame(render);
  };

  render();

  // 返回清理函数
  return () => {
    cancelAnimationFrame(rafId);
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseenter', handleMouseEnter);
    document.removeEventListener('mouseleave', handleMouseLeave);
    document.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('mouseup', handleMouseUp);
    cursor.remove();
    styleEl.remove();
  };
}
