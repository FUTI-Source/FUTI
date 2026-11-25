/* 视口高度稳定性脚本
 *
 * 为什么需要 JS 测量：
 * iOS 主屏应用（standalone PWA）里 dvh 往往比真实屏幕小一段（底部指示条区域），
 * 纯 CSS 100dvh 会让 html/body 高度不足，页面底部露出系统黑底。
 * 所以这里实测高度写入 --app-height，并持续校正。
 *
 * 取值策略：
 * - 布局高度以 innerHeight 为准；它在 PWA/普通浏览器都代表完整布局视口。
 * - iOS 主屏冷启动时 innerHeight 可能仍是带 Safari 工具栏的旧值，
 *   且暂时偏大，用 screen.height 在「差值合理（<400px）」时取较大值兜底。
 * - 软键盘弹出会压缩 visualViewport，此时不能缩画布，否则键盘收起后留黑边。
 *
 * 同时负责：
 * - 给 iOS 主屏应用标记 class（顶部状态栏视觉补偿）；
 * - 键盘收起后复位被顶起的滚动位置。
 */
(function () { try {
  var root = document.documentElement;
  var nav = window.navigator;
  var ios = /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  var standalone = window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    nav.standalone === true;
  if (ios && standalone) root.classList.add('ios-standalone');

  var lastStableHeight = 0;
  var applyHeight = function (h) {
    if (h > 0 && Math.abs(h - lastStableHeight) >= 1) {
      lastStableHeight = h;
      var px = h + 'px';
      root.style.setProperty('--app-height', px);
      // 同步写 inline min-height：CSS 层的 dvh 回退在 iOS PWA 偏小，
      // inline 值优先级最高，确保 html 画布铺满真实屏幕，底部不露系统黑底。
      root.style.minHeight = px;
    }
  };

  var measure = function () {
    var inner = window.innerHeight || 0;
    var vv = window.visualViewport;
    var vvHeight = vv ? vv.height : inner;

    // 软键盘弹出：视觉视口明显缩小，保持上一稳定高度，不缩画布
    if (vvHeight > 0 && inner - vvHeight > 140) {
      if (lastStableHeight) applyHeight(lastStableHeight);
      return;
    }

    var h = inner;
    // iOS 主屏冷启动兜底：screen.height 含状态栏，若比 inner 大且差值合理，取较大值
    if (ios && standalone && window.screen && window.screen.height > h) {
      var diff = window.screen.height - h;
      if (diff > 0 && diff < 400) h = window.screen.height;
    }
    applyHeight(h);
  };

  // 首帧同步执行，避免先按错误高度画一帧
  measure();

  var resizeTimer = 0;
  var scheduleMeasure = function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(measure, 80);
  };
  window.addEventListener('resize', scheduleMeasure);
  window.addEventListener('orientationchange', scheduleMeasure);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleMeasure);
  }

  var keyboardTimers = [];
  var scheduleScrollReset = function () {
    keyboardTimers.forEach(window.clearTimeout);
    keyboardTimers = [];
    [120, 400].forEach(function (delay) {
      keyboardTimers.push(window.setTimeout(function () {
        if (window.scrollY) window.scrollTo(0, 0);
        var scroller = document.querySelector('[data-slot="scroll-area"]');
        if (scroller) scroller.scrollTop = 0;
        var dialogBodies = document.querySelectorAll('.site-dialog-body');
        for (var i = 0; i < dialogBodies.length; i++) dialogBodies[i].scrollTop = 0;
      }, delay));
    });
  };

  // 后台恢复后重新测量并复位滚动：锁屏期间视口尺寸可能变化
  var onRestore = function () {
    scheduleMeasure();
    scheduleScrollReset();
  };
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') onRestore();
  });
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) onRestore();
  });
  document.addEventListener('focusout', function (event) {
    var tag = event.target && event.target.tagName;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') return;
    scheduleScrollReset();
  }, true);
} catch (e) { console.error(e); } })();
