(function () {
  try {
    /* 最低版本必须与 src/config/site 的 SITE_BROWSER_MINIMUMS 保持一致。
     * 这里不能用 ES6+ 写法：旧内核要能先执行这段脚本，再决定是否跳转。 */
    var MIN = {
      chrome: 125,
      edge: 125,
      firefox: 126,
      safari: 17.5,
      ios: 17.5
    };
    var BOT_PATTERN =
      /(bot|crawl|spider|slurp|facebookexternalhit|lighthouse|pagespeed|headlesschrome)/i;

    var p = window.location && window.location.pathname || '';
    if (p.indexOf('/browser-unsupported') === 0) return;

    var ua = window.navigator && window.navigator.userAgent || '';
    if (!ua || BOT_PATTERN.test(ua)) return;

    function redirect() {
      if (window.location) {
        window.location.replace('/browser-unsupported?from=runtime-check');
      }
    }

    function parseVersion(userAgent, pattern) {
      var match = userAgent.match(pattern);
      if (!match) return null;
      var version = parseFloat(match[1]);
      return isFinite(version) ? version : null;
    }

    function parseIosVersion(userAgent) {
      var safariVersion = parseVersion(userAgent, /\bVersion\/(\d+(?:\.\d+)?)/);
      if (safariVersion !== null) return safariVersion;

      var match = userAgent.match(/\b(?:iPhone OS|CPU OS) (\d+)(?:[_.](\d+))?/i);
      if (!match) return null;
      return parseFloat(match[1] + '.' + (match[2] || '0'));
    }

    function versionUnsupported(userAgent) {
      if (/MSIE\s|Trident\//.test(userAgent)) return true;
      if (/\bEdge\/\d/.test(userAgent) && !/\bEdg\/\d/.test(userAgent)) return true;

      /* iOS / iPadOS 上所有浏览器都走系统 WebKit：优先 Version/，
       * 微信等 WebView 没有 Version/ 时读 iPhone OS / CPU OS。 */
      if (/iPhone|iPad|iPod/i.test(userAgent)) {
        var ios = parseIosVersion(userAgent);
        return ios !== null ? ios < MIN.ios : false;
      }

      /* Edge 必须在 Chrome 之前判断，因为 Edge UA 里同时带 Edg/ 和 Chrome/。 */
      var edge = parseVersion(userAgent, /\bEdg(?:e|A|iOS)?\/(\d+(?:\.\d+)?)/);
      if (edge !== null) return edge < MIN.edge;

      /* Chrome 及 Chromium 系套壳浏览器统一按 Chrome 内核版本判断。 */
      var chrome = parseVersion(userAgent, /\bChrome\/(\d+(?:\.\d+)?)/);
      if (chrome !== null) return chrome < MIN.chrome;

      var firefox = parseVersion(userAgent, /\bFirefox\/(\d+(?:\.\d+)?)/);
      if (firefox !== null) return firefox < MIN.firefox;

      var safari = parseVersion(userAgent, /\bVersion\/(\d+(?:\.\d+)?)/);
      if (safari !== null && /Safari\//.test(userAgent)) return safari < MIN.safari;

      return false;
    }

    function syntaxSupported() {
      try {
        /* 实测可选链、空值合并、逻辑赋值与静态类字段，
         * 用来兜住伪造高版本 UA、但内核实际过旧的浏览器。 */
        return new Function(
          'var o={a:1};o||={};class C{static s=1};return (o.a??0)+(C&&C.s||0);'
        )() === 2;
      } catch (e) {
        return false;
      }
    }

    if (versionUnsupported(ua) || !syntaxSupported()) redirect();
  } catch (e) {}
})();
