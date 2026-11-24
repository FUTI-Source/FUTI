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
// 软键盘弹出时 visualViewport.height 会缩短（与 innerHeight 差值远大于状态栏）。
// 此时不能把 --app-height 压小，否则键盘收起后页面比画布矮，底部留下黑色间隔。
if(inner-h>140)h=lastHeight||inner;
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
// iOS 软键盘收起后文档可能停留在被上推的位置，底部露出一段黑色画布。
// 收起过程会持续调整视口，因此分两次复查：先归零文档滚动，再校正画布高度。
var keyboardTimers=[];
var scheduleKeyboardReset=function(){
keyboardTimers.forEach(clearTimeout);
keyboardTimers=[];
[120,400].forEach(function(delay){
keyboardTimers.push(setTimeout(function(){
if(window.scrollY)window.scrollTo(0,0);
var scroller=document.querySelector('[data-slot="scroll-area"]');
if(scroller)scroller.scrollTop=0;
update();
},delay));
});
};
if(window.visualViewport){
var lastVvHeight=window.visualViewport.height;
window.visualViewport.addEventListener('resize',function(){
var h=window.visualViewport.height;
// 视觉视口明显变高即软键盘收起，同样归零滚动并复查高度
if(h-lastVvHeight>140)scheduleKeyboardReset();
lastVvHeight=h;
update();
});
}
// 隐藏/恢复原生标题栏会切换 display-mode，resize 可能晚于媒体查询变化。
// 桌面 WCO 切换原生标题栏/进出全屏时，媒体查询与 fullscreenchange 可能早于窗口尺寸稳定，
// 因此都补一次延迟复查；退出 WCO 后脚本值重新生效，这一步保证不会沿用旧高度。
var recheck=function(){update();setTimeout(function(){pending=0;update();},300)};
standaloneQuery.addEventListener('change',recheck);
wcoQuery.addEventListener('change',recheck);
document.addEventListener('fullscreenchange',recheck);
document.addEventListener('visibilitychange',function(){if(!document.hidden)update()});
document.addEventListener('focusout',function(event){
var tag=event.target&&event.target.tagName;
if(tag!=='INPUT'&&tag!=='TEXTAREA'&&tag!=='SELECT')return;
scheduleKeyboardReset();
},true);
}catch(e){console.error(e)}})();
