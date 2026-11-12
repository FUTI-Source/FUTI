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
        width: 36px;
        height: 36px;
        background: ${color};
        border-radius: 50%;
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
        opacity: 0.14;
        transform: scale(2.2);
      }

      #custom-cursor-dot.active {
        opacity: 0.55;
        transform: scale(0.6);
      }

      * {
        cursor: url("data:image/svg+xml,<svg xmlns='http://w3.org' viewBox='0 0 14 14' width='14px' height='14px'><circle cx='7' cy='7' r='6' fill='${encodedColor}' opacity='.85'/></svg>") 7 7, auto !important;
      }
    `;
  };

  updateStyle();
  document.head.appendChild(styleEl);

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
    // 跟随圆点宽高为 36px，减去半径 18px 使其精确居中对齐指针中心
    if (pos.curr === null) {
      move(e.clientX - 18, e.clientY - 18);
    }
    pos.curr = { x: e.clientX - 18, y: e.clientY - 18 };
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
