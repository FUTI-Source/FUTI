/**
 * 生成 15 张示例文章封面（SVG，1200×675）。
 * 运行：bun scripts/gen-demo-covers.ts
 * 输出：public/assets/posts/demo-<slug>.svg
 */
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "assets", "posts");
const W = 1200;
const H = 675;

interface Cover {
  slug: string;
  title: string;
  label: string;
  from: string;
  to: string;
  pattern: "mountains" | "circles" | "waves" | "rings" | "dots";
}

const covers: Cover[] = [
  { slug: "morning-market", title: "清晨的菜市场", label: "示例文章 · 美食", from: "#f59e0b", to: "#ef4444", pattern: "mountains" },
  { slug: "balcony-garden", title: "阳台种菜半年记", label: "示例文章 · 生活", from: "#34d399", to: "#0ea5e9", pattern: "circles" },
  { slug: "film-camera-first", title: "胶片相机初体验", label: "示例文章 · 摄影", from: "#64748b", to: "#1e293b", pattern: "rings" },
  { slug: "night-running-routes", title: "夜跑路线指南", label: "示例文章 · 运动", from: "#0ea5e9", to: "#172554", pattern: "waves" },
  { slug: "rainy-cafe-tour", title: "雨天的咖啡馆巡礼", label: "示例文章 · 咖啡", from: "#6366f1", to: "#312e81", pattern: "dots" },
  { slug: "bw-light-practice", title: "黑白摄影光影练习", label: "示例文章 · 摄影", from: "#9ca3af", to: "#111827", pattern: "mountains" },
  { slug: "braised-pork-notes", title: "红烧肉的做法复盘", label: "示例文章 · 美食", from: "#b45309", to: "#7c2d12", pattern: "circles" },
  { slug: "podcast-recording-starter", title: "播客录音入门", label: "示例文章 · 音乐", from: "#f43f5e", to: "#7c3aed", pattern: "rings" },
  { slug: "city-cycling-commute", title: "城市骑行通勤", label: "示例文章 · 城市", from: "#06b6d4", to: "#1e40af", pattern: "waves" },
  { slug: "winter-tea-by-fire", title: "围炉煮茶的下午", label: "示例文章 · 生活", from: "#d97706", to: "#9a3412", pattern: "dots" },
  { slug: "reading-notes-method", title: "读书笔记的方法", label: "示例文章 · 阅读", from: "#10b981", to: "#065f46", pattern: "mountains" },
  { slug: "travel-photography-composition", title: "旅拍的构图取舍", label: "示例文章 · 摄影", from: "#f59e0b", to: "#4338ca", pattern: "circles" },
  { slug: "declutter-moving", title: "搬家断舍离实践", label: "示例文章 · 生活", from: "#14b8a6", to: "#115e59", pattern: "waves" },
  { slug: "ethiopia-coffee-beans", title: "埃塞俄比亚咖啡豆", label: "示例文章 · 咖啡", from: "#ca8a04", to: "#713f12", pattern: "rings" },
  { slug: "photo-year-review", title: "年度摄影总结", label: "示例文章 · 摄影", from: "#8b5cf6", to: "#1e1b4b", pattern: "dots" },
];

function mountains(from: string): string {
  return `
  <circle cx="950" cy="180" r="90" fill="#ffffff" opacity="0.25"/>
  <polygon points="0,675 0,480 220,330 420,500 620,380 840,540 1050,430 1200,520 1200,675" fill="#ffffff" opacity="0.18"/>
  <polygon points="0,675 0,560 260,440 500,590 760,470 1000,610 1200,540 1200,675" fill="#ffffff" opacity="0.30"/>`;
}

function circles(from: string): string {
  return `
  <circle cx="980" cy="200" r="260" fill="#ffffff" opacity="0.12"/>
  <circle cx="980" cy="200" r="180" fill="#ffffff" opacity="0.16"/>
  <circle cx="980" cy="200" r="100" fill="#ffffff" opacity="0.22"/>
  <circle cx="180" cy="560" r="120" fill="#ffffff" opacity="0.10"/>`;
}

function waves(from: string): string {
  return `
  <path d="M0,430 Q300,360 600,430 T1200,430 V675 H0 Z" fill="#ffffff" opacity="0.12"/>
  <path d="M0,510 Q300,440 600,510 T1200,510 V675 H0 Z" fill="#ffffff" opacity="0.18"/>
  <path d="M0,590 Q300,520 600,590 T1200,590 V675 H0 Z" fill="#ffffff" opacity="0.26"/>`;
}

function rings(from: string): string {
  return `
  <g fill="none" stroke="#ffffff">
    <circle cx="950" cy="230" r="80"  stroke-opacity="0.30" stroke-width="10"/>
    <circle cx="950" cy="230" r="150" stroke-opacity="0.20" stroke-width="10"/>
    <circle cx="950" cy="230" r="220" stroke-opacity="0.13" stroke-width="10"/>
    <circle cx="950" cy="230" r="290" stroke-opacity="0.08" stroke-width="10"/>
  </g>
  <circle cx="200" cy="540" r="14" fill="#ffffff" opacity="0.35"/>`;
}

function dots(from: string): string {
  const dots: string[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 8; c++) {
      dots.push(`<circle cx="${760 + c * 56}" cy="${96 + r * 56}" r="9" fill="#ffffff" opacity="${0.10 + r * 0.05}"/>`);
    }
  }
  return `
  ${dots.join("\n  ")}
  <path d="M0,675 A420,420 0 0 1 420,255 L420,675 Z" fill="#ffffff" opacity="0.10"/>`;
}

const patterns = { mountains, circles, waves, rings, dots };

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function coverSvg(c: Cover): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c.from}"/>
      <stop offset="1" stop-color="${c.to}"/>
    </linearGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.5" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.45"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${patterns[c.pattern](c.from)}
  <rect width="${W}" height="${H}" fill="url(#shade)"/>
  <g fill="#ffffff" font-family="'PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif">
    <text x="80" y="548" font-size="28" letter-spacing="8" opacity="0.85">${escapeXml(c.label)}</text>
    <text x="80" y="616" font-size="56" font-weight="700">${escapeXml(c.title)}</text>
  </g>
</svg>
`;
}

fs.mkdirSync(OUT, { recursive: true });
for (const c of covers) {
  const file = path.join(OUT, `demo-${c.slug}.svg`);
  fs.writeFileSync(file, coverSvg(c), "utf8");
  console.log(`已生成 ${path.basename(file)}`);
}
console.log(`共 ${covers.length} 张封面 → ${OUT}`);
