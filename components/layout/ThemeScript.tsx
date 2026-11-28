"use client";

import { useRef } from "react";
import { useServerInsertedHTML } from "next/navigation";

// 与 Menca 原版一致：仅记住用户主动选择的深色模式，并在首屏前应用（避免闪烁）。
// 通过 useServerInsertedHTML 注入到文档流，而非渲染进 React 组件树，
// 从而规避 React 19 “Encountered a script tag while rendering React component” 告警。
const themeInitScript = `if(localStorage.getItem("theme")==="dark"){document.documentElement.setAttribute("dark","");document.documentElement.classList.add("dark-mode");}`;

export function ThemeScript() {
  // useServerInsertedHTML 的回调会在 SSR 流的每个 flush 点被调用；
  // 用 ref 守卫确保静态脚本只注入一次，避免在多个 flush 边界重复输出。
  const injected = useRef(false);

  useServerInsertedHTML(() => {
    if (injected.current) return null;
    injected.current = true;
    return <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />;
  });

  return null;
}
