(function(){try{
var root=document.documentElement;
var nav=window.navigator;
var ios=/iPad|iPhone|iPod/.test(nav.userAgent)||(nav.platform==='MacIntel'&&nav.maxTouchPoints>1);
var standalone=window.matchMedia('(display-mode: standalone)').matches||window.matchMedia('(display-mode: fullscreen)').matches||nav.standalone===true;
var homeScreen=ios&&standalone;
if(homeScreen)root.classList.add('ios-standalone');
var standaloneQuery=window.matchMedia('(display-mode: standalone)');
var wcoQuery=window.matchMedia('(display-mode: window-controls-overlay)');
var lastWidth=0,lastHeight=0,pending=0,first=true;
var measure=function(){
var w=window.innerWidth||0;
var inner=window.innerHeight||0;
var vv=window.visualViewport;
var h=inner;
if(homeScreen){
if(first){
// 首帧冷启动：innerHeight 可能还带 Safari 工具栏高度，取较大值并用屏幕高度兜底。
if(vv&&vv.height>h)h=vv.height;
var sh=window.screen.height;
if(sh>h&&sh-h<=200)h=sh;
}else if(vv&&vv.height>0){
// 稳定后 PWA 没有浏览器工具栏，visualViewport.height 就是真实可视区域。
// 原生状态栏显隐只会改变它；若继续取 innerHeight 的较大值，页面会比视口高而产生滚动。
h=vv.height;
}
}
return {w:w,h:h};
};
var apply=function(m){
if(!m||!m.w||!m.h)return;
if(m.h===lastHeight&&m.w===lastWidth)return;
lastWidth=m.w;lastHeight=m.h;
root.style.setProperty('--app-height',m.h+'px');
};
var update=function(){
var m=measure();
if(!m.w||!m.h)return;
// 首次、变高或宽度变化立即应用；变低延迟确认后再应用，
// 既能跟随原生状态栏切换，又能跳过 iOS 冷启动瞬时偏小的视口。
if(first){
first=false;apply(m);
// 首帧兜底可能比真实视口高（状态栏已显示时）；补一次复查收敛到真实高度。
setTimeout(function(){pending=0;update();},300);
return;
}
if(m.h>lastHeight||m.w!==lastWidth){apply(m);return;}
if(m.h===lastHeight){if(pending){clearTimeout(pending);pending=0;}return;}
if(pending)clearTimeout(pending);
// 延时确认时重新测量，避免应用已经恢复的旧值。
pending=setTimeout(function(){pending=0;apply(measure());},120);
};
update();
window.addEventListener('resize',update);
window.addEventListener('orientationchange',update);
window.addEventListener('pageshow',update);
if(window.visualViewport)window.visualViewport.addEventListener('resize',update);
// 隐藏/恢复原生标题栏会切换 display-mode，resize 可能晚于媒体查询变化。
standaloneQuery.addEventListener('change',update);
wcoQuery.addEventListener('change',update);
// 桌面 WCO 进出全屏会切换原生标题栏与视口，事件可能早于窗口尺寸稳定，补一次复查。
document.addEventListener('fullscreenchange',function(){update();setTimeout(function(){pending=0;update();},300)});
document.addEventListener('visibilitychange',function(){if(!document.hidden)update()});
}catch(e){console.error(e)}})();
