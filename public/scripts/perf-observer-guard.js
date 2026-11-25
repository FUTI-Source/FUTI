/* PerformanceObserver 条目类型兼容层
 *
 * 背景：Chrome 支持 layout-shift / event 等性能条目，Firefox 不支持。
 * 第三方脚本（例如 Umami 的 Web Vitals 采集）通常不先做能力检测，直接
 * PerformanceObserver.observe({ type: 'layout-shift' })，
 * Firefox 就会在控制台打印「Ignoring unsupported entryTypes: layout-shift」。
 *
 * 这里在注册时按 PerformanceObserver.supportedEntryTypes 过滤掉不支持的条目：
 * 与浏览器自身的忽略行为等价（本来也收不到回调），但不再产生噪音日志。
 * 支持这些条目的浏览器不走过滤分支，采集结果不受影响。
 */
(function () { try {
  var Observer = window.PerformanceObserver;
  if (!Observer || !Observer.prototype || !Observer.supportedEntryTypes) return;

  var supported = Observer.supportedEntryTypes;
  var nativeObserve = Observer.prototype.observe;
  if (typeof nativeObserve !== 'function') return;

  var isSupported = function (type) {
    for (var i = 0; i < supported.length; i++) {
      if (supported[i] === type) return true;
    }
    return false;
  };

  Observer.prototype.observe = function (options) {
    if (options) {
      // 单类型写法：不支持时直接不观察（传空 entryTypes 会抛 TypeError）
      if (typeof options.type === 'string' && !isSupported(options.type)) return;

      if (Object.prototype.toString.call(options.entryTypes) === '[object Array]') {
        var filtered = [];
        for (var i = 0; i < options.entryTypes.length; i++) {
          if (isSupported(options.entryTypes[i])) filtered.push(options.entryTypes[i]);
        }
        if (!filtered.length) return;
        if (filtered.length !== options.entryTypes.length) {
          var patched = {};
          for (var key in options) {
            if (Object.prototype.hasOwnProperty.call(options, key)) patched[key] = options[key];
          }
          patched.entryTypes = filtered;
          return nativeObserve.call(this, patched);
        }
      }
    }
    return nativeObserve.apply(this, arguments);
  };
} catch (e) {} })();
