/**
 * ════════════════════════════════════════════════════════════════════
 * 站点全局配置（唯一入口）
 * ════════════════════════════════════════════════════════════════════
 *
 * 本文件集中了站点所有「可公开」的配置：域名、部署平台、国内外分流、
 * 文案、SEO、备案、打赏档位、统计与 CDN 白名单等。需要改站点行为时，
 * 优先只改这里。
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
 * 2. 部署平台与国内外分流
 *
 * 站点同时部署在火山引擎 IGA Pages（境内）与 Vercel（境外）。
 * 首选做法是 DNS 分线路解析（见 README「国内外自动分流」），代码完全不参与；
 * 下面的 geoRouting 只是**兜底开关**，默认关闭。
 * ══════════════════════════════════════════════════════════════════ */

/** 两个平台各自的访问地址。同一套代码，两份部署。 */
export const SITE_DEPLOY_TARGETS = {
  /**
   * 境内链路：火山引擎 IGA Pages。
   * 绑定自定义域名时填自定义域名地址；未绑定时 `*.preview.iga-pages.com`
   * 预览域名只有 3 小时有效期，不适合作为分流目标。
   */
  cn: SITE_URL,
  /**
   * 境外链路：Vercel。留空表示境外链路没有独立可访问地址，
   * 此时应用内兜底跳转不会生效（缺目标一律就地服务）。
   * 填项目域名（`xxx.vercel.app`）或已解析到 Vercel 的独立域名。
   */
  overseas: '',
} as const;

/**
 * 应用内地域兜底跳转。
 *
 * ⚠️ 默认 enabled: false。首选做法是 DNS「智能解析」按线路出结果
 * （境内 → IGA、境外 → Vercel），DNS 层分流没有跳转开销、也不会被缓存污染。
 * 本开关只处理「DNS 出错了 / 访客走到了另一侧」的情况。
 *
 * 能做到什么，取决于平台回传什么（已按官方能力核实）：
 *  - Vercel 侧：官方注入 `x-vercel-ip-country`（ISO 3166-1 alpha-2），
 *    因此「境内访客落到 Vercel」可以 307 送回 cn 目标，这条方向是真实可用的。
 *  - 火山 DCDN / IGA Pages 侧：回源请求头只能带 uri、host、client_ip、
 *    remote_addr、remote_port、msec、scheme、args 等 11 个变量，
 *    **没有任何国家/省份字段**。所以「境外访客落到 IGA」这一方向拿不到信号，
 *    会按「未知地域」就地服务（不会跳错，只是慢）。要这一方向也生效，
 *    只能自己在边缘按 client_ip 判定后注入一个自定义头，再把它加进 countryHeaders。
 *
 * 判定依据只信 CDN/平台回传的地域头：
 *  - 头缺失或取值不在名单里 → 判为「未知」→ 不动作。
 *    这条 fail-open 规则是防死循环的关键：任何一侧拿不到可信信号都不跳转。
 *  - 跳转时写入短期 Cookie（见 redirectCookie）作为第二道闸门。
 */
export const SITE_GEO_ROUTING = {
  enabled: false,
  /**
   * 判定「境内」的国家/地区代码（ISO 3166-1 alpha-2，大小写不敏感）。
   * 命中 → 送往 cn 目标；能拿到可信信号且未命中 → 视为境外。
   * 需要港澳台走境外链路时保持现状；想让它们留在境内链路就加 HK / MO / TW。
   */
  cnCountryCodes: ['CN'],
  /**
   * 读取地域信号的请求头，按数组顺序取第一个非空值。
   * 只填**确实会回传**的头：填了不存在的头不会报错，只会让该方向永远不生效。
   *  - x-vercel-ip-country：Vercel 官方，生产环境一定有。
   *  - cf-ipcountry：仅当站点套了 Cloudflare。
   *  - x-forwarded-country / x-geo-country：自己边缘脚本注入时才填。
   */
  countryHeaders: ['x-vercel-ip-country', 'cf-ipcountry'],
  /** 跨平台跳转用 307：临时重定向，不被浏览器永久缓存，随时可回滚 */
  statusCode: 307 as const,
  /**
   * 防回环 Cookie。10 分钟足够覆盖一次跳转往返；
   * 值是最终落地平台标识，只用于「同会话不二次跳转」判断与排障。
   */
  redirectCookie: {
    name: 'site-region',
    maxAgeSeconds: 600,
  },
} as const;

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
/** 左下角水印品牌字，同时用于 SVG 内联标记 */
export const SITE_BRAND = 'MINE';

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

/* ══════════════════════════════════════════════════════════════════
 * 7. 页脚与主题署名
 * ══════════════════════════════════════════════════════════════════ */

/** 版权起始年份，页脚会渲染成「2017 - 当前年」 */
export const SITE_COPYRIGHT_START = 2017;
export const SITE_THEME_CREDIT = 'Drawn by NAVILAB';
/** 悬停时显示的别名，用于给画师/模型来源留不同署名 */
export const SITE_THEME_CREDIT_HOVER = 'Drawn by Navigator Kepler';

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
 * 或者按需在 src/features/home/components/home.tsx 里覆盖。
 */
export const SITE_ANALYTICS_DOMAINS = `${SITE_HOSTNAME},${SITE_DOMAIN}`;

/**
 * 静态资源缓存策略，由 next.config.ts 读取并写入响应头，交给 DCDN / Vercel Edge 缓存。
 *
 * - immutable：public/ 下带版本或确定不再变更的文件（字体、启动图），浏览器与 CDN 存一年。
 * - static：可能随版本更新的文件（Live2D 模型、文档配图），一周，避免模型更新后长期命中旧文件。
 *
 * 换模型或改字体文件名后想立即生效，调小 staticTtl 或在 CDN 侧主动刷新。
 */
export const SITE_CDN_CACHE = {
  immutable: 'public, max-age=31536000, immutable',
  static: 'public, max-age=604800',
  /** Service Worker 必须永不缓存，否则更新推不下去 */
  serviceWorker: 'no-cache, no-store, must-revalidate',
} as const;

/* ══════════════════════════════════════════════════════════════════
 * 9. 服务端出站调用
 * ══════════════════════════════════════════════════════════════════ */

/** 调用微信 / 支付宝网关时携带的 User-Agent，便于在商户后台日志里识别来源 */
export const SITE_USER_AGENT = 'zhang-wentao-site/1.0';

interface SiteSocialLinks {
  blog: string;
  github: string;
}

/** 社交链接，留空时对应入口不跳转，也不会写入结构化数据 */
export const SITE_SOCIAL_LINKS: SiteSocialLinks = {
  blog: '',
  github: '',
};
