const lerp = (a: number, b: number, n: number) => (1 - n) * a + n * b;

export function initCustomCursor() {
  if (typeof window === 'undefined' || window.matchMedia('(pointer: coarse)').matches) {
    return;
  }

  if (document.getElementById('custom-cursor-dot')) return;

  const getThemeColor = () => {
    const isDark =
      document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDark ? '#fff' : '#000';
  };

  const styleEl = document.createElement('style');
  styleEl.id = 'custom-cursor-style';

  const updateStyle = () => {
    const color = getThemeColor();
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
        cursor: url("data:image/svg+xml,<svg xmlns='http://w3.org' viewBox='0 0 8 8' width='8px' height='8px'><circle cx='4' cy='4' r='4' fill='${encodedColor}' opacity='.5'/></svg>") 4 4, auto !important;
      }
    `;
  };

  updateStyle();
  document.head.appendChild(styleEl);

  // 监听系统深浅色切换与 html class 变化（如切换主题按钮）
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', updateStyle);
  const observer = new MutationObserver(updateStyle);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

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

  return () => {
    cancelAnimationFrame(rafId);
    mediaQuery.removeEventListener('change', updateStyle);
    observer.disconnect();
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
