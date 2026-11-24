(function(){try{
var nav=window.navigator||{};
var ua=nav.userAgent||'';
var q=window.location.search||'';
if(nav.webdriver||/[?&]preview=1(?:&|$)/.test(q)||/HeadlessChrome|Vercel-Screenshot|IGA-Screenshot/i.test(ua))document.documentElement.classList.add('preload-skip');
}catch(e){}})();
