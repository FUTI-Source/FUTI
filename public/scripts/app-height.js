(function(){try{
var root=document.documentElement;
var nav=window.navigator;
var ios=/iPad|iPhone|iPod/.test(nav.userAgent)||(nav.platform==='MacIntel'&&nav.maxTouchPoints>1);
var standalone=window.matchMedia('(display-mode: standalone)').matches||window.matchMedia('(display-mode: fullscreen)').matches||nav.standalone===true;
var homeScreen=ios&&standalone;
if(homeScreen)root.classList.add('ios-standalone');
var standaloneQuery=window.matchMedia('(display-mode: standalone)');
var wcoQuery=window.matchMedia('(display-mode: window-controls-overlay)');
var lastWidth=0,lastHeight=0;
var update=function(){
var w=window.innerWidth||0;
var inner=window.innerHeight||0;
var vv=window.visualViewport;
var h=inner;
if(homeScreen&&vv&&vv.height>h)h=vv.height;
if(homeScreen){
var screenHeight=window.screen.height;
if(screenHeight>h&&screenHeight-h<=200)h=screenHeight;
}
if(!w||!h)return;
// iOS 主屏启动期间视口会先给出偏小高度；桌面 standalone/WCO 必须允许缩小。
if(homeScreen&&h<lastHeight&&w===lastWidth)return;
if(h===lastHeight&&w===lastWidth)return;
lastWidth=w;lastHeight=h;
root.style.setProperty('--app-height',h+'px');
};
update();
window.addEventListener('resize',update);
window.addEventListener('orientationchange',update);
window.addEventListener('pageshow',update);
if(window.visualViewport)window.visualViewport.addEventListener('resize',update);
// 隐藏/恢复原生标题栏会切换 display-mode，resize 可能晚于媒体查询变化。
standaloneQuery.addEventListener('change',update);
wcoQuery.addEventListener('change',update);
document.addEventListener('visibilitychange',function(){if(!document.hidden)update()});
}catch(e){console.error(e)}})();
