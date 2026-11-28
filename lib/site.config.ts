/**
 * 全站配置（唯一入口）。
 * - 站点域名不出现在项目任何位置，完全由部署环境自动识别（任何平台）：
 *   NEXT_PUBLIC_SITE_URL（显式指定，可选）
 *   > Vercel / Cloudflare Pages / Render / Netlify / Railway 的平台域名变量
 *   > 都没有时回退到本地开发地址
 * - colors 与 app/uno.css 的 :root 设计令牌保持一致（CSS 无法读取 TS，改动时需人工同步）
 */
function normalizeSiteUrl(value: string | undefined): string | null {
  const v = value?.trim().replace(/\/+$/, "");
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

function detectSiteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_URL, // Vercel（无协议，需补 https）
    process.env.CF_PAGES_URL, // Cloudflare Pages
    process.env.RENDER_EXTERNAL_URL, // Render
    process.env.NETLIFY_URL, // Netlify
    process.env.RAILWAY_PUBLIC_DOMAIN, // Railway（无协议，需补 https）
  ];
  for (const candidate of candidates) {
    const normalized = normalizeSiteUrl(candidate);
    if (normalized) return normalized;
  }
  return "http://localhost:3000";
}

/** 展示用域名：由站点地址派生（去掉协议与尾部斜杠）。 */
function toDisplayDomain(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

const detectedUrl = detectSiteUrl();

export const site = {
  /** 基础信息 */
  title: "张文涛",
  /** 拉丁署名（刊头小字 / 分享卡 / JSON-LD alternateName） */
  alternateName: "Zhang Wentao",
  description: "个人网站与博客，记录与写作。",
  /** 标语（分享卡页脚等场景） */
  tagline: "随笔 · 生活 · 影像",
  /** 由部署环境自动识别（见 detectSiteUrl） */
  url: detectedUrl,
  /** 展示用域名（由 url 自动派生，分享卡页脚等纯文案场景） */
  domain: toDisplayDomain(detectedUrl),
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
