/**
 * 回弹（入场动画）工具：与主题 `.animate` / `animateElement` 关键帧配合使用。
 */

/** 重放所有 `.animate` 元素的入场回弹（移除再恢复动画以强制从头播放）。 */
export function replayBounce(): void {
  document.querySelectorAll<HTMLElement>(".animate").forEach((el) => {
    el.style.animation = "none";
    void el.offsetWidth; // 强制回流，确保动画重新启动
    el.style.animation = "";
  });
}

/**
 * 按 hash 查找锚点目标元素。
 * 站内链接的 href 为百分号编码（如 #城市），而标签 id 保留中文原文，
 * 因此解码后优先匹配，编码原文作兼容回退。
 */
export function findHashTarget(hash: string): Element | null {
  const raw = hash.replace(/^#/, "");
  if (!raw || raw === "top") return null;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // 保留原文
  }
  return (
    document.getElementById(decoded) ??
    document.getElementById(raw) ??
    document.getElementsByName(raw)[0] ??
    null
  );
}

/**
 * 计算元素相对于文档顶部的布局位置。
 * 用 offsetTop 链累加而非 getBoundingClientRect()：入场回弹会给容器加
 * translateY 位移，后者在动画期间会带上这个视觉偏移。
 */
export function getLayoutTop(el: Element): number {
  let y = 0;
  let node = el instanceof HTMLElement ? el : null;
  while (node) {
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return y;
}

/**
 * 等待当前滚动结束后执行回调。
 * 优先使用 scrollend 事件，同时以“滚动位置持续不变”作为快速判定：
 * - 滚动结束后约 150ms 即触发（替代 scrollend）；
 * - 压根没有滚动发生时（如重复点击当前锚点）避免干等超时。
 * 回调内自行校验落点是否符合预期（如已滚到顶部 / 目标在视口顶部附近）。
 */
export function whenScrollSettled(onSettled: () => void, timeoutMs = 2500): void {
  let done = false;
  let timer = 0;
  let raf = 0;
  const finish = () => {
    if (done) return;
    done = true;
    window.removeEventListener("scrollend", finish);
    clearTimeout(timer);
    cancelAnimationFrame(raf);
    onSettled();
  };
  timer = window.setTimeout(finish, timeoutMs);

  let last = window.scrollY;
  let lastChange = performance.now();
  const tick = () => {
    if (done) return;
    const y = window.scrollY;
    if (y !== last) {
      last = y;
      lastChange = performance.now();
    } else if (performance.now() - lastChange > 150) {
      finish();
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  const hasScrollEnd = "onscrollend" in window;
  if (hasScrollEnd) {
    window.addEventListener("scrollend", finish, { once: true });
  }
}
