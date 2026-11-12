const lerp = (a: number, b: number, n: number) => (1 - n) * a + n * b;

export function initCustomCursor() {
  // 触摸屏设备跳过
  if (typeof window === 'undefined' || window.matchMedia('(pointer: coarse)').matches) {
    return;
  }

  if (document.getElementById('custom-cursor-dot')) return;

  const styleEl = document.createElement('style');
  styleEl.id = 'custom-cursor-style';
  styleEl.textContent = `
    #custom-cursor-dot {
      position: fixed;
      top: 0;
      left: 0;
      width: 36px;
      height: 36px;
      background: #ffffff;
      border-radius: 50%;
      opacity: 0.35;
      /* 柔和的多层白色发光阴影 */
      box-shadow: 0 0 12px 2px rgba(255, 255, 255, 0.45), 0 0 24px 6px rgba(255, 255, 255, 0.2);
      z-index: 10086;
      pointer-events: none;
      transition: 0.2s ease-in-out;
      transition-property: opacity, transform, box-shadow;
    }

    #custom-cursor-dot.hidden {
      opacity: 0;
    }

    #custom-cursor-dot.hover {
      opacity: 0.2;
      transform: scale(2.2);
      box-shadow: 0 0 18px 4px rgba(255, 255, 255, 0.5), 0 0 36px 10px rgba(255, 255, 255, 0.25);
    }

    #custom-cursor-dot.active {
      opacity: 0.65;
      transform: scale(0.6);
      box-shadow: 0 0 8px 2px rgba(255, 255, 255, 0.7);
    }

    /* 彻底隐藏所有元素的原生鼠标指针 */
    *, *::before, *::after {
      cursor: none !important;
    }
  `;
  document.head.appendChild(styleEl);

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
