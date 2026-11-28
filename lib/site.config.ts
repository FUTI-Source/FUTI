/**
 * 站点地址不再写死在代码里，按部署环境自动识别：
 * 1. NEXT_PUBLIC_SITE_URL —— 显式指定（可选，推荐生产环境设置自定义域名）
 * 2. VERCEL_URL —— Vercel 部署时平台自动注入
 * 3. 都没有时回退到本地开发地址
 */
function detectSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.trim().replace(/\/+$/, "");
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const site = {
  title: "张文涛",
  description: "个人网站与博客，记录与写作。",
  // 由部署环境自动识别（见 detectSiteUrl）
  url: detectSiteUrl(),
  perPage: 9,
  nav: [
    { label: "首页", href: "/" },
    { label: "标签", href: "/tags" },
  ],
} as const;
