import { defineConfig, presetAttributify, presetUno } from "unocss";

// 设计令牌迁移自 styles/menca/sass/0-settings/
//   _color-scheme.scss 与 _variables.scss
// 作为未来 UnoCSS 原子类开发的单一来源。
// 现有语义化样式仍由 app/menca.css 提供，保证视觉零回归。
export default defineConfig({
  presets: [presetUno(), presetAttributify()],
  theme: {
    colors: {
      brand: "#0073ec",
      "brand-hover": "#4f31c7",
      "light-gray": "#f0f0f0",
      "light-blue": "#f3f7ff",
      "blue-gray": "#716f8a",
      gray: "#9e9e9e",
      dark: "#0c101a",
      "dark-alt": "#111016",
      "dark-blue": "#1e2740",
    },
    fontFamily: {
      sans: ["var(--font-jost)", "Jost", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
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
