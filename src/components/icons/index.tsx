import React from 'react';

/**
 * 本地图标库。
 *
 * 全站图标不再依赖 lucide-react / @icons-pack/react-simple-icons 两个第三方包，
 * 统一收在这里以内联 SVG 渲染：零运行时依赖、可 tree-shaking、样式跟随
 * currentColor 与 Tailwind 的 fill / stroke 工具类。
 *
 * 路径数据来源：
 *  - 描边图标：lucide-static（ISC License）
 *  - 品牌图标：simple-icons（CC0）
 * 新增图标时从对应来源拷贝 <svg> 的子元素即可，骨架不用动。
 */

/** 图标通用属性：与原生 <svg> 一致，尺寸/颜色通过 className 控制 */
export type IconProps = React.SVGProps<SVGSVGElement>;

/** 任意图标组件的类型，供按钮列表等动态渲染场景使用 */
export type IconComponent = React.FC<IconProps>;

/** 描边图标骨架：lucide 风格（fill none + stroke currentColor） */
const StrokeIcon: React.FC<IconProps> = ({ children, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

/** 品牌图标骨架：simple-icons 实心路径（fill currentColor） */
const BrandIcon: React.FC<IconProps> = ({ children, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

/* ── 品牌图标（社交链接） ─────────────────────────────────────────── */

export const IconRss: IconComponent = (props) => (
  <BrandIcon {...props}>
    <path d="M19.199 24C19.199 13.467 10.533 4.8 0 4.8V0c13.165 0 24 10.835 24 24h-4.801zM3.291 17.415c1.814 0 3.293 1.479 3.293 3.295 0 1.813-1.485 3.29-3.301 3.29C1.47 24 0 22.526 0 20.71s1.475-3.294 3.291-3.295zM15.909 24h-4.665c0-6.169-5.075-11.245-11.244-11.245V8.09c8.727 0 15.909 7.184 15.909 15.91z" />
  </BrandIcon>
);

export const IconGithub: IconComponent = (props) => (
  <BrandIcon {...props}>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </BrandIcon>
);

export const IconGmail: IconComponent = (props) => (
  <BrandIcon {...props}>
    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
  </BrandIcon>
);

/* ── 操作按钮图标 ────────────────────────────────────────────────── */

export const IconHandHeart: IconComponent = (props) => (
  <StrokeIcon {...props}>
    <path d="M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16" />
    <path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9" />
    <path d="m2 15 6 6" />
    <path d="M19.5 8.5c.7-.7 1.5-1.6 1.5-2.7A2.73 2.73 0 0 0 16 4a2.78 2.78 0 0 0-5 1.8c0 1.2.8 2 1.5 2.8L16 12Z" />
  </StrokeIcon>
);

/* ── 界面反馈图标（弹窗 / 表单状态） ─────────────────────────────── */

export const IconX: IconComponent = (props) => (
  <StrokeIcon {...props}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </StrokeIcon>
);

export const IconLoader: IconComponent = (props) => (
  <StrokeIcon {...props}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </StrokeIcon>
);

export const IconCircleCheck: IconComponent = (props) => (
  <StrokeIcon {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </StrokeIcon>
);

export const IconCircleAlert: IconComponent = (props) => (
  <StrokeIcon {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </StrokeIcon>
);

export const IconCircleX: IconComponent = (props) => (
  <StrokeIcon {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </StrokeIcon>
);

export const IconExternalLink: IconComponent = (props) => (
  <StrokeIcon {...props}>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </StrokeIcon>
);

export const IconQrCode: IconComponent = (props) => (
  <StrokeIcon {...props}>
    <rect width="5" height="5" x="3" y="3" rx="1" />
    <rect width="5" height="5" x="16" y="3" rx="1" />
    <rect width="5" height="5" x="3" y="16" rx="1" />
    <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
    <path d="M21 21v.01" />
    <path d="M12 7v3a2 2 0 0 1-2 2H7" />
    <path d="M3 12h.01" />
    <path d="M12 3h.01" />
    <path d="M12 16v.01" />
    <path d="M16 12h1" />
    <path d="M21 12v.01" />
    <path d="M12 21v-1" />
  </StrokeIcon>
);

export const IconWallet: IconComponent = (props) => (
  <StrokeIcon {...props}>
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
  </StrokeIcon>
);

export const IconSend: IconComponent = (props) => (
  <StrokeIcon {...props}>
    <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
    <path d="m21.854 2.147-10.94 10.939" />
  </StrokeIcon>
);
