/* 视口稳定性脚本
 *
 * 历史问题：早期版本用 JS 测量 innerHeight / visualViewport.height 并写入
 * --app-height，试图手动适配 iOS 主屏应用、键盘、状态栏、冷启动等各种场景。
 * 但 JS 测量永远存在时序差，每种场景都要打补丁，且相互冲突，最终导致
 * 键盘收起或冷启动时画布比视口矮、底部露出黑色区域。
 *
 * 现在的方案：视口高度完全交给 CSS 原生 100dvh（见 styles/index.css），
 * 浏览器会实时、原子地更新，不存在 JS 测量时序问题。本脚本只做两件事：
 *   1. 给 iOS 主屏应用标记 class，用于顶部状态栏的视觉补偿；
 *   2. 键盘收起后复位被顶起的滚动位置（dvh 会自动恢复高度，这里只清残留滚动）。
 */
(function () { try {
  var root = document.documentElement;
  var nav = window.navigator;
  var ios = /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  var standalone = window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    nav.standalone === true;
  if (ios && standalone) root.classList.add('ios-standalone');

  var keyboardTimers = [];
  var scheduleScrollReset = function () {
    keyboardTimers.forEach(clearTimeout);
    keyboardTimers = [];
    // 键盘收起是渐进过程，分两次复查确保滚动归零
    [120, 400].forEach(function (delay) {
      keyboardTimers.push(setTimeout(function () {
        if (window.scrollY) window.scrollTo(0, 0);
        var scroller = document.querySelector('[data-slot="scroll-area"]');
        if (scroller) scroller.scrollTop = 0;
        var dialogBodies = document.querySelectorAll('.site-dialog-body');
        for (var i = 0; i < dialogBodies.length; i++) dialogBodies[i].scrollTop = 0;
      }, delay));
    });
  };

  if (window.visualViewport) {
    var lastVvHeight = window.visualViewport.height;
    window.visualViewport.addEventListener('resize', function () {
      var h = window.visualViewport.height;
      // 视觉视口明显变高 = 软键盘收起
      if (h - lastVvHeight > 140) scheduleScrollReset();
      lastVvHeight = h;
    });
  }

  document.addEventListener('focusout', function (event) {
    var tag = event.target && event.target.tagName;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') return;
    scheduleScrollReset();
  }, true);
} catch (e) { console.error(e); } })();
