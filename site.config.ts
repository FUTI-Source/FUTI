/**
 * ════════════════════════════════════════════════════════════════════
 * 站点全局配置（唯一入口）
 * ════════════════════════════════════════════════════════════════════
 *
 * 本文件集中了站点所有「可公开」的配置：单域名、文案、SEO、备案、
 * 打赏档位、统计与 CDN 缓存等。分流在 DNS 控制台完成，不在代码里。
 * 需要改站点行为时，优先只改这里。
 *
 * 三条硬性原则
 *  1. 这里只放公开信息。本文件同时被服务端和客户端组件引用，值会被内联进
 *     浏览器产物，等同于对全网公开。任何密钥、AppSecret、私钥、Webhook token
 *     一律走环境变量，读取入口集中在 `src/config/env.ts`。
 *  2. 只在构建时求值。模块顶层的派生计算（如从 SITE_URL 解析主机名）发生在
 *     构建阶段，改完必须重新部署才生效，不支持运行时热改。
 *  3. 不要再加环境变量。历史上 NEXT_PUBLIC_* 的那几个开关已收回本文件，
 *     站点身份类配置统一在 Git 里评审；确实只有「部署环境不同才不同」的值
 *     （密钥、临时回调地址）才用环境变量。
 *
 * 引入方式：`import { SITE_URL } from '~/site.config';`
 * `~/*` 在 tsconfig.json 的 paths 里指向仓库根目录（与 `@/*` → src/* 并存）。
 */

/* ══════════════════════════════════════════════════════════════════
 * 1. 域名与主机名
 *
 * 只需要填 SITE_URL 一项，其余主机名全部由它派生，避免多处手写不一致。
 * ══════════════════════════════════════════════════════════════════ */

/**
 * 站点正式地址：必须带协议、带 www（如果站点使用 www）。
 * 影响范围：SEO canonical 与 metadataBase、sitemap.xml、robots.txt、
 * OG / QQ 分享图的绝对地址、微信与支付宝回调地址的默认拼接基准、
 * 统计域名白名单。
 */
export const SITE_URL = 'https://www.zhang-wentao.tech';

/** 由 SITE_URL 自动解析，例如 `www.zhang-wentao.tech`；不要手改 */
export const SITE_HOSTNAME = new URL(SITE_URL).hostname;

/**
 * 裸域（apex），由 SITE_URL 自动去掉 www 前缀，例如 `zhang-wentao.tech`。
 * 用于统计域名白名单与「裸域 → www」自动重定向的匹配。
 */
export const SITE_DOMAIN = SITE_HOSTNAME.replace(/^www\./, '');

/**
 * 裸域自动补 www。
 *
 * enabled 为 true 时，`src/proxy.ts` 会在请求主机名命中
 * SITE_HOSTNAME / SITE_DOMAIN 且**不以 `www.` 开头**时，返回 308 永久重定向
 * 到同主机的 www 版本（路径、查询串、锚点原样保留）。
 *
 * 之所以「自动识别」而不是写死一条 `zhang-wentao.tech → www.…` 的规则：
 * 换域名时只改 SITE_URL 即可，裸域规则会跟着自动变；同时平台预览域名
 * （`*.vercel.app`、`*.preview.iga-pages.com`）与 localhost 不在名单里，
 * 不会被误加 www 而跳到生产。
 *
 * 关掉它的唯一场景：DNS 没有裸域记录（此时请求根本到不了站点，留着也无害）。
 */
export const SITE_WWW_REDIRECT = {
  enabled: true,
  /** 308 保留请求方法与请求体；改 301 会被浏览器永久缓存，回滚成本高 */
  statusCode: 308 as const,
} as const;

/* ══════════════════════════════════════════════════════════════════
 * 2. 部署与分流（单域名，DNS 层）
 *
 * 境内 IGA Pages 与境外 Vercel 共用 SITE_URL 这一个对外域名。
 * 分流只在 DNS 分线路完成：中国内地线路 → IGA 加速域名，全球/默认
 * 线路 → Vercel。访客全程只访问 SITE_HOSTNAME，两个平台返回同一个
 * 域名的页面，因此代码里不存在平台地址、地域头判定或跨域跳转。
 *
 * 更换平台或 CDN 供应商时，只改 DNS 记录与平台侧域名绑定，不要再加
 * 第二个对外域名，也不要在 proxy 里补地域跳转规则。
 * ══════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════
 * 3. 语言与站点文案
 * ══════════════════════════════════════════════════════════════════ */

/** `<html lang>` 与 sitemap 的 languageAlternate；同时决定 Umami identify 上报以外的展示语言 */
export const SITE_LANG = 'zh-CN';
/** Open Graph 使用的 locale（下划线格式） */
export const SITE_LOCALE = 'zh_CN';

/** 浏览器标签页标题、结构化数据 name、通知标题前缀 */
export const SITE_NAME = '张文涛 · 个人主页';
/** meta description 与 manifest description */
export const SITE_DESCRIPTION = '张文涛的个人主页，分享全栈开发、开源项目与技术实践。';
/** meta keywords（对主流搜索引擎权重极低，保留给国内搜索与社交抓取） */
export const SITE_KEYWORDS = ['张文涛', '个人主页', '全栈开发', '开源项目', 'Web 开发'];
/** 首页副标题签名（打字机文案） */
export const SITE_SIGNATURE = '分享 · 开源 · 实践';

/** 结构化数据与页脚使用的真实姓名 */
export const SITE_AUTHOR_NAME = '张文涛';
export const SITE_JOB_TITLE = '全栈开发者';
/** 页脚英文职称（与 SITE_JOB_TITLE 分开，切换站点语言时各自维护） */
export const SITE_JOB_TITLE_EN = 'Full Stack Developer';
/** 个人技能标签，写入 JSON-LD knowsAbout */
export const SITE_KNOWS_ABOUT = ['全栈开发', '开源项目', 'Web 开发'] as const;

/* ══════════════════════════════════════════════════════════════════
 * 4. SEO 与分享图资源
 * ══════════════════════════════════════════════════════════════════ */

/**
 * Twitter/X 账号，不含 @。留空则不输出 twitter:site / twitter:creator。
 * 只有在 X 上真的注册了同名站点账号时才填写，否则会被平台判定为无效声明。
 */
export const SITE_TWITTER_HANDLE = '';

/** 站点图标（favicon 引用路径，文件在 public/ 下） */
export const SITE_ICON_PATH = '/favicon.ico';
/** 192×192 图标，作为未生成专用分享图时的兜底 */
export const SITE_IMAGE_PATH = '/icon-192x192.png';
/** 分享卡片主图：1200×630，微信 / QQ / Twitter / Telegram 通用 */
export const SITE_SOCIAL_IMAGE = {
  path: '/og-image.png',
  width: 1200,
  height: 630,
  type: 'image/png',
} as const;

/* ══════════════════════════════════════════════════════════════════
 * 5. 备案信息（页脚）
 * ══════════════════════════════════════════════════════════════════ */

/**
 * ICP 备案号。留空字符串则页脚不渲染备案区块。
 * 域名、接入商或主体变更后要同步更新，否则会被判定为悬挂备案。
 */
export const ICP_NUMBER = '晋ICP备2026019630号';
/** 备案号查询页链接，国内统一为工信部网站 */
export const ICP_LINK = 'https://beian.miit.gov.cn/';

/* ══════════════════════════════════════════════════════════════════
 * 6. 打赏（前端校验 + 下单参数）
 * ══════════════════════════════════════════════════════════════════ */

/** 单笔最小金额（元）。必须与 zod 校验、支付网关下限一致 */
export const DONATION_MIN_AMOUNT = 1;
/** 单笔最大金额（元）。同时受支付渠道单笔限额约束 */
export const DONATION_MAX_AMOUNT = 10000;
/** 订单标题，出现在支付页面与商户账单里 */
export const DONATION_SUBJECT = '打赏支持';

/*
 * PayPal 渠道（面向境外访客，与上面的人民币档位相互独立）。
 * 凭据（PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / PAYPAL_ENV / PAYPAL_WEBHOOK_ID）
 * 是密钥或环境差异项，放在环境变量里；这里只放币种与金额档位。
 */
/** PayPal 收款币种代码（USD / EUR / HKD 等，需与 PayPal 商户账户支持的币种一致） */
export const PAYPAL_CURRENCY = 'USD';
/** 单笔最小金额（按 PayPal 币种计），与 zod 校验一致 */
export const PAYPAL_MIN_AMOUNT = 1;
/** 单笔最大金额（按 PayPal 币种计） */
export const PAYPAL_MAX_AMOUNT = 500;

/* ══════════════════════════════════════════════════════════════════
 * 7. 页脚与主题署名
 * ══════════════════════════════════════════════════════════════════ */

/** 版权起始年份，页脚会渲染成「2017 - 当前年」 */
export const SITE_COPYRIGHT_START = 2016;

/* ══════════════════════════════════════════════════════════════════
 * 8. 统计与 CDN
 * ══════════════════════════════════════════════════════════════════ */

/** Umami 服务端地址（自建则改成自己的域名）。同时用于 <link rel="preconnect"> */
export const SITE_ANALYTICS_URL = 'https://cloud.umami.is';
/** Umami 后台本站点的 website id，泄露无风险（本身就是公开脚本参数） */
export const SITE_ANALYTICS_WEBSITE_ID = '123ce0ff-afc4-4a61-9435-9face57dbd70';
/**
 * 统计域名白名单（只统计这些域名，多个逗号分隔）。
 * 由 SITE_URL 自动派生 www + 裸域两条，平台预览域名不在名单内，
 * 因此预览/本地流量不会写进正式数据。加新域名时改这里，
 * 或者按需在 src/features/home/home.tsx 里覆盖。
 */
export const SITE_ANALYTICS_DOMAINS = `${SITE_HOSTNAME},${SITE_DOMAIN}`;

/**
 * 静态资源缓存策略，由 next.config.ts 读取并写入响应头，交给 DCDN / Vercel Edge 缓存。
 * 缓存头只按路径设置，在共用同一域名的两条部署链路上表现一致，与平台/线路无关。
 *
 * 所有值都同时给出浏览器缓存（max-age）与共享缓存（s-maxage）时长：
 * s-maxage 优先级高于 max-age，且只作用于 CDN / 反向代理，便于让 CDN 缓存更久、
 * 浏览器按各自的短周期回源校验，互不牵制。
 *
 * - immutable：带内容哈希或确定不再变更的文件（字体、启动图），浏览器与 CDN 都存一年。
 * - static：可能随版本更新的文件（Live2D 模型、文档配图）。一周强缓存 + 一天
 *   stale-while-revalidate（过期后先返回旧副本、后台异步刷新）+ 一周 stale-if-error
 *   （源站故障时继续用旧副本），既不牺牲首屏速度也避免模型更新后长期命中旧文件。
 * - api：接口一律不缓存。支付回调、订单查询、Webhook 都不能被 CDN 复用响应。
 *
 * 换模型或改字体文件名后想立即生效，调小 static 的 max-age 或在 CDN 侧主动刷新。
 */
export const SITE_CDN_CACHE = {
  immutable: 'public, max-age=31536000, s-maxage=31536000, immutable',
  static:
    'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400, stale-if-error=604800',
  /** Service Worker 必须永不缓存，否则新版本推不下去；no-transform 防止 CDN 压缩/改写脚本 */
  serviceWorker: 'no-cache, no-store, must-revalidate, no-transform',
  /** 接口一律不缓存：支付回调、订单状态与 Webhook 响应不允许被共享缓存复用 */
  api: 'no-store, no-cache, must-revalidate, private',
} as const;

/* ══════════════════════════════════════════════════════════════════
 * 8.5 PWA / Service Worker
 *
 * PWA 相关的路径、主题色、注册行为与 SW 缓存边界统一在这里维护，
 * 其他文件只读取本对象，不再各自写死 /serwist/sw.js、/~offline 等常量。
 * ══════════════════════════════════════════════════════════════════ */

export const SITE_PWA = {
  /** manifest 的 theme_color / background_color */
  themeColor: '#15161a',
  /** Safari 顶部工具栏着色，与 manifest 主题色分开维护 */
  browserThemeColor: '#1d1e20',

  icons: [
    { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  ],
  screenshots: [
    { src: '/screenshot-desktop.png', sizes: '1280x627', type: 'image/png', formFactor: 'wide' },
    { src: '/screenshot-mobile.png', sizes: '390x751', type: 'image/png', formFactor: 'narrow' },
  ],

  /** SW 源码路径（相对仓库根目录）与对外脚本地址 */
  swSrc: 'src/app/sw.ts',
  swUrl: '/serwist/sw.js',
  scope: '/',
  /** 文档请求离线且无缓存时的兜底页 */
  offlineUrl: '/~offline',
  /** 迁移期要注销的旧 SW 路径与旧手写缓存前缀 */
  legacySwPath: '/sw.js',
  legacyCachePrefix: 'site-',

  /** 注册行为：关闭自动 reload/history 改写，避免后台恢复时白屏 */
  updateViaCache: 'none' as const,
  cacheOnNavigation: false,
  reloadOnOnline: false,

  /** SW 生命周期与缓存边界 */
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  apiPrefix: '/api/',

  /** SW 内部 fetch 允许放行的跨域来源，next.config.ts 据此生成 connect-src */
  connectOrigins: [
    SITE_ANALYTICS_URL,
    'wss://cloud.umami.is',
    'https://va.vercel-scripts.com',
    'https://*.paypal.com',
    'https://music.126.net',
    'https://*.music.126.net',
  ],
} as const;

/* ══════════════════════════════════════════════════════════════════
 * 9. 服务端出站调用
 * ══════════════════════════════════════════════════════════════════ */

/** 调用微信 / 支付宝网关时携带的 User-Agent，便于在商户后台日志里识别来源 */
export const SITE_USER_AGENT = 'zhang-wentao-site/1.0';

/** 社交链接，留空时对应入口不跳转，也不会写入结构化数据 */
export const SITE_SOCIAL_LINKS = {
  blog: '',
  github: '',
} as const;

/* ══════════════════════════════════════════════════════════════════
 * 9.5 浏览器版本检查
 *
 * 检测逻辑在 src/lib/browser-support.ts，由 src/proxy.ts 在每个页面
 * 请求上执行：不达标的浏览器 302 重定向到版本过低页
 * public/browser-unsupported.html（路径在 proxy.ts 内定死，无需配置；
 * 纯静态 HTML、零 JS，旧内核浏览器不会再加载任何框架产物，
 * /scripts/browser-check.js 会在首帧前做版本与内核语法能力兜底）。
 * API 与静态资源不在 proxy 的 matcher 里，不受影响；.html 路径由
 * CDN 直接命中，不走 proxy。
 * ══════════════════════════════════════════════════════════════════ */

/** 站点支持的最低浏览器版本，与 package.json 的 browserslist 保持一致 */
export const SITE_BROWSER_MINIMUMS = {
  chrome: 125,
  edge: 125,
  firefox: 126,
  safari: 17.5,
  ios: 17.5,
} as const;

/* ══════════════════════════════════════════════════════════════════
 * 9.6 音乐胶囊
 *
 * 所有公开的音乐配置统一放在这里。Cookie 等敏感信息仍然只走服务端环境变量，
 * 不要写进本文件。
 * ══════════════════════════════════════════════════════════════════ */

export interface MusicTrack {
  title: string;
  artist?: string;
  /** 音频地址，本地文件建议放到 public/music/ 下 */
  src: string;
  /** 封面地址，留空时播放器显示默认音符图标 */
  cover?: string;
}

export type MetingServer = 'netease' | 'tencent' | 'kugou' | 'baidu' | 'kuwo';
export type MetingType = 'song' | 'playlist' | 'album' | 'artist' | 'search';

export interface MusicPlaylistSource {
  /** 音乐平台：netease 网易云、tencent QQ、kugou 酷狗、baidu、kuwo */
  server: MetingServer;
  /** 资源类型：song 单曲、playlist 歌单、album 专辑、artist 歌手、search 搜索 */
  type: MetingType;
  /** 资源 ID，从歌单/歌曲分享链接里取 */
  id: string;
}

/**
 * 外部 Meting API 地址。
 * 留空时使用项目内置 @meting/core 自建解析；这里只能放公开地址，不要放 Cookie 或密钥。
 */
export const SITE_MUSIC_API_BASE = '';

/** 本地曲目。配置在线歌单后，在线歌单会覆盖这里的内容。 */
export const SITE_MUSIC_TRACKS: readonly MusicTrack[] = [
  // {
  //   title: '示例歌曲',
  //   artist: '示例歌手',
  //   src: '/music/example.mp3',
  //   cover: '/images/example.webp',
  // },
];

/** 在线歌单来源，对应 HeoMusic / MetingJS 的 server、type、id 参数。 */
export const SITE_MUSIC_PLAYLIST: MusicPlaylistSource = {
  server: 'netease',
  type: 'playlist',
  id: '8152976493',
};

// 示例：
// export const SITE_MUSIC_PLAYLIST: MusicPlaylistSource = {
//   server: 'netease',
//   type: 'playlist',
//   id: '7360465359',
// };
