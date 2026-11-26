'use client';

/**
 * 首帧同步脚本只在服务端输出，客户端 hydration 时返回 null。
 *
 * 原因：预览环境、浏览器扩展、运营商等会往 <head> 插入额外的内联 <script>，
 * React 会把它和这里的第一个 <script> 逐个对位比较，导致后续节点整体错位并抛出
 * hydration mismatch。客户端不渲染这些节点后，React 会把它们当作 <head> 单例里
 * 的额外节点直接跳过，脚本本身已由浏览器在解析期执行，行为不受影响。
 */
export function HeadScripts() {
  if (typeof window !== 'undefined') return null;

  return (
    <>
      {/* 内核语法能力检测：360 等浏览器会伪造高版本 Chrome UA，服务端按 UA 放行后
          旧内核解析 ES2022 产物会抛 SyntaxError 导致页面白屏，
          这里在一切脚本之前实测语法能力，不达标立即跳转到版本过低页 */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts --
          必须同步：不达标浏览器应在新语法代码执行前被重定向 */}
      <script src="/scripts/browser-check.js" />
      {/* 性能条目兼容层：过滤 Firefox 不支持的 layout-shift 等条目类型，
          消除第三方统计脚本（Umami Web Vitals）的控制台噪音。
          不改变支持的浏览器里的采集结果，也不影响布局。
          用 defer 即可：统计脚本都在 hydration 之后才注入，晚于本脚本执行。 */}
      <script src="/scripts/perf-observer-guard.js" defer />
      {/* 视口稳定性：实测 --app-height 并同步 html min-height，修复 iOS 主屏 PWA
          底部黑边；同时标记 ios-standalone。实测值会等样式表就绪后再写入，
          避免在解析期强制排版（Firefox 会因此报无样式内容闪烁）。 */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts --
          必须同步：ios-standalone class 要在首帧绘制前就位，避免状态栏补偿闪一下 */}
      <script src="/scripts/app-height.js" />
    </>
  );
}
