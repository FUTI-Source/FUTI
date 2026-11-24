(function(){try{
/* 浏览器内核语法能力检测（服务端 UA 判定的兜底）。
 * 部分浏览器（如 360 安全/极速浏览器）默认上报伪造的高版本 Chrome UA，
 * 服务端按 UA 放行后，页面 JS 产物（ES2022）在旧内核上解析阶段即抛
 * "Uncaught SyntaxError" 且无法运行。这里用极小的 ES5 脚本实测语法能力：
 * 通过 new Function 编译一段含可选链(?.)、空值合并(??)、逻辑赋值(||=)、
 * 静态类字段(class static)的代码——Chrome 125+ / Safari 17.5+ / Firefox 126+
 * （即 browserslist 最低基线）全部支持，旧内核会在解析阶段抛 SyntaxError。
 * 实测不达标立即跳转到版本过低页，避免白屏或半渲染页面。 */
var p=window.location&&window.location.pathname||'';
if(p.indexOf('/browser-unsupported')===0)return;
var ok=false;
try{ok=new Function('var o={a:1};o||={};class C{static s=1};return (o.a??0)+(C&&C.s||0);')()===2;}catch(e){ok=false;}
if(!ok&&window.location)window.location.replace('/browser-unsupported.html?from=runtime-check');
}catch(e){}})();
