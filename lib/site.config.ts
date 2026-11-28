/**
 * 全站配置（唯一入口）。
 * - 站点地址按部署环境自动识别：NEXT_PUBLIC_SITE_URL > VERCEL_URL > 本地开发地址
 * - colors 与 app/uno.css 的 :root 设计令牌保持一致（CSS 无法读取 TS，改动时需人工同步）
 */
function detectSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.trim().replace(/\/+$/, "");
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const site = {
  /** 基础信息 */
  title: "张文涛",
  /** 拉丁署名（刊头小字 / 分享卡 / JSON-LD alternateName） */
  alternateName: "Zhang Wentao",
  /** 展示用域名（分享卡页脚等纯文案场景） */
  domain: "www.zhang-wentao.tech",
  description: "个人网站与博客，记录与写作。",
  /** 标语（分享卡页脚等场景） */
  tagline: "随笔 · 生活 · 影像",
  /** 由部署环境自动识别（见 detectSiteUrl） */
  url: detectSiteUrl(),
  /** 导航 */
  nav: [
    { label: "首页", href: "/" },
    { label: "标签", href: "/tags" },
  ],

  /** 品牌：印章名标 + 主题色（与 uno.css :root 令牌同步） */
  sealChar: "文",
  colors: {
    brand: "#0073ec",
    heading: "#1e2740",
    muted: "#716f8a",
    background: "#ffffff",
    backgroundDark: "#0c101a",
  },

  /** 内容与阅读 */
  perPage: 9,
  /** 阅读时长估算：每分钟字数 */
  readingCharsPerMinute: 400,
  /** 摘要截断长度（字符） */
  excerptChars: 80,
  /** 相关文章数量 */
  relatedPostsLimit: 3,

  /** Open Graph 分享卡尺寸 */
  og: { width: 1200, height: 630 },
} as const;
