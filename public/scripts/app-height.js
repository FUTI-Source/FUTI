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
 * 写入时机（Firefox 修复）：
 * - 首帧只打 ios-standalone 标记：class 变化不改尺寸，不会触发样式解析；
 * - 实测高度必须等所有样式表就绪后再写。Firefox 在样式表未载入完成时，
 *   只要脚本做一次几何查询（visualViewport.height）或写入 html 的
 *   inline min-height，就会同步解析样式/布局，控制台报「已在页面完全加载前
 *   强制排版……可能导致无样式内容闪烁」；
 * - 首次落位额外跳过软键盘判断，不读 visualViewport，只取 innerHeight；
 * - CSS 侧已有 100vh / 100dvh 兜底，晚一帧写入不会产生可见跳动，
 *   但能彻底消除解析期的强制排版。
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

  var raf = window.requestAnimationFrame
    ? window.requestAnimationFrame.bind(window)
    : function (callback) { return window.setTimeout(callback, 16); };

  /* 样式表是否就绪：以 <link rel="stylesheet"> 的 sheet 是否生成判断。
   * 内联 <style> 是解析时就同步生效的，不参与等待。
   * 读取 sheet 不会触发样式解析，可以安全轮询。 */
  var stylesReady = function () {
    var links = document.querySelectorAll('link[rel~="stylesheet"]');
    for (var i = 0; i < links.length; i++) {
      if (!links[i].sheet) return false;
    }
    return true;
  };

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

  var applyMeasure = function (checkKeyboard) {
    var inner = window.innerHeight || 0;

    // 软键盘弹出：视觉视口明显缩小，保持上一稳定高度，不缩画布。
    // 首次落位跳过这段：键盘不可能弹着，而读 visualViewport 属于几何查询，
    // 在样式表刚就绪、页面还没 load 的阶段读它，正是 Firefox 报
    // 「已在页面完全加载前强制排版」的触发点之一。
    if (checkKeyboard) {
      var vv = window.visualViewport;
      var vvHeight = vv ? vv.height : inner;
      if (vvHeight > 0 && inner - vvHeight > 140) {
        if (lastStableHeight) applyHeight(lastStableHeight);
        return;
      }
    }

    var h = inner;
    // iOS 主屏冷启动兜底：screen.height 含状态栏，若比 inner 大且差值合理，取较大值
    if (ios && standalone && window.screen && window.screen.height > h) {
      var diff = window.screen.height - h;
      if (diff > 0 && diff < 400) h = window.screen.height;
    }
    applyHeight(h);
  };

  // 样式就绪后放到下一帧写入：rAF 在渲染帧开始时执行，此时样式解析会走常规流程，
  // 不会在脚本里同步触发；同时写入的值能赶上这一帧绘制，iOS 主屏首帧也不会闪黑边。
  // 另留定时器兜底——后台标签页里 rAF 会被节流，恢复可见时高度也不会缺位。
  var commitAfterPaint = function () {
    raf(function () {
      if (document.readyState !== 'loading' && stylesReady()) applyMeasure(false);
    });
    window.setTimeout(function () {
      if (document.readyState !== 'loading' && stylesReady()) applyMeasure(false);
    }, 300);
  };

  var waitingForStyles = false;
  var deferUntilStylesLoaded = function () {
    if (waitingForStyles) return;
    waitingForStyles = true;
    var attempts = 0;
    var tick = function () {
      if (document.readyState === 'loading' || !stylesReady()) {
        // 最多等 5s：样式表被拦截等异常场景也要保证高度最终落位
        if (++attempts <= 100) {
          window.setTimeout(tick, 50);
          return;
        }
      }
      waitingForStyles = false;
      commitAfterPaint();
    };
    tick();
  };

  var measure = function () {
    // 解析期一律不动样式，交给就绪后的统一落位
    if (document.readyState === 'loading' || !stylesReady()) {
      deferUntilStylesLoaded();
      return;
    }
    applyMeasure(true);
  };

  // 首帧不再同步测量：同步写入会在样式表加载期间强制排版（Firefox FOUC 警告）
  deferUntilStylesLoaded();

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
