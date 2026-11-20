const lerp = (a: number, b: number, n: number) => (1 - n) * a + n * b;

export function initCustomCursor() {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const supportsCustomPointer = window.matchMedia(
    '(hover: hover) and (pointer: fine)',
  ).matches;
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  if (!supportsCustomPointer || prefersReducedMotion) return () => {};

  if (document.getElementById('custom-cursor-dot')) return () => {};

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
      box-shadow: 0 0 12px 2px rgba(255, 255, 255, 0.45), 0 0 24px 6px rgba(255, 255, 255, 0.2);
      z-index: 10086;
      pointer-events: none;
      scale: 1;
      transition: 0.2s ease-in-out;
      transition-property: opacity, scale, box-shadow;
    }

    #custom-cursor-dot.hidden {
      opacity: 0;
    }

    #custom-cursor-dot.hover {
      opacity: 0.2;
      scale: 2.2;
      box-shadow: 0 0 18px 4px rgba(255, 255, 255, 0.5), 0 0 36px 10px rgba(255, 255, 255, 0.25);
    }

    #custom-cursor-dot.active {
      opacity: 0.65;
      scale: 0.6;
      box-shadow: 0 0 8px 2px rgba(255, 255, 255, 0.7);
    }

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

  let rafId: number | undefined;
  let paused = document.visibilityState === 'hidden';

  const move = (left: number, top: number) => {
    cursor.style.translate = `${left}px ${top}px`;
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
    const next = { x: e.clientX - 18, y: e.clientY - 18 };
    if (pos.curr === null) {
      move(next.x, next.y);
      pos.prev = { ...next };
    }
    pos.curr = next;
    cursor.classList.remove('hidden');
    scheduleRender();
  };

  const handleMouseEnter = () => {
    cursor.classList.remove('hidden');
    scheduleRender();
  };
  const handleMouseLeave = () => {
    cursor.classList.add('hidden');
    stopRender();
  };
  const handleMouseDown = () => cursor.classList.add('active');
  const handleMouseUp = () => cursor.classList.remove('active');

  const handleVisibility = () => {
    paused = document.visibilityState === 'hidden';
    if (paused) {
      stopRender();
    } else {
      scheduleRender();
    }
  };

  document.addEventListener('mouseover', handleMouseOver, true);
  document.addEventListener('mousemove', handleMouseMove, { passive: true });
  document.addEventListener('mouseenter', handleMouseEnter);
  document.addEventListener('mouseleave', handleMouseLeave);
  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('visibilitychange', handleVisibility);

  const stopRender = () => {
    if (rafId !== undefined) cancelAnimationFrame(rafId);
    rafId = undefined;
  };

  const scheduleRender = () => {
    if (paused || !pos.curr || rafId !== undefined) return;
    rafId = requestAnimationFrame(render);
  };

  const render = () => {
    rafId = undefined;
    if (paused || !pos.curr) return;

    if (!pos.prev) pos.prev = { ...pos.curr };
    pos.prev.x = lerp(pos.prev.x, pos.curr.x, 0.15);
    pos.prev.y = lerp(pos.prev.y, pos.curr.y, 0.15);
    move(pos.prev.x, pos.prev.y);

    const remainingX = pos.curr.x - pos.prev.x;
    const remainingY = pos.curr.y - pos.prev.y;
    if (Math.abs(remainingX) > 0.05 || Math.abs(remainingY) > 0.05) {
      scheduleRender();
    } else {
      pos.prev = { ...pos.curr };
      move(pos.prev.x, pos.prev.y);
    }
  };

  // 清理函数
  return () => {
    stopRender();
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseenter', handleMouseEnter);
    document.removeEventListener('mouseleave', handleMouseLeave);
    document.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('visibilitychange', handleVisibility);
    cursor.remove();
    styleEl.remove();
  };
}
