import { defineConfig, presetAttributify, presetUno } from "unocss";

// UnoCSS 提供工具类层（@unocss：preflights + default），
// 供 EmptyState 等组件的原子类使用；Menca 主题的完整样式（令牌/网格/组件/
// 关键帧/排版/hljs/响应式/深色）保留在 app/uno.css 原始 CSS 中，经本管道统一处理。
export default defineConfig({
  presets: [presetUno(), presetAttributify()],
    theme: {
      // 语义色指向 CSS 变量，浅/深色随 uno.css 中 :root / :root[dark] 自动切换
      // （品牌色等基值与 lib/site.config.ts 的 colors 同步维护）
      colors: {
      brand: "var(--brand-color)",
      "brand-hover": "#4f31c7",
      white: "#fff",
      "light-gray": "var(--light-gray)",
      "light-blue": "var(--light-blue)",
      "blue-gray": "var(--blue-gray)",
      gray: "var(--gray)",
      dark: "var(--dark)",
      "dark-blue": "#1e2740",
      bg: "var(--background-color)",
      "bg-alt": "var(--background-alt-color)",
      text: "var(--text-color)",
      "text-alt": "var(--text-alt-color)",
      heading: "var(--heading-font-color)",
      link: "var(--link-color)",
      "link-hover": "var(--link-color-hover)",
      border: "var(--border-color)",
      th: "var(--th-color)",
      tr: "var(--tr-color)",
    },
    fontFamily: {
      sans: ["Noto Serif SC", "var(--font-jost)", "Jost", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
    },
    // 与 Menca 原始断点对齐（移动端优先的 min-width，对应原始 max-width 体系）
    breakpoints: {
      sm: "576px",
      md: "768px",
      lg: "1024px",
      xl: "1140px",
    },
    spacing: {
      base: "16px",
    },
    borderRadius: {
      global: "3px",
    },
    transitionProperty: {
      global: "all",
    },
    transitionDuration: {
      global: "350ms",
    },
  },
});
