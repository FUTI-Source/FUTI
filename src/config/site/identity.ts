/**
 * 站点身份：域名、语言、文案、备案与社交链接。
 * 只放公开信息；密钥与环境差异项在 src/config/env.ts。
 */

/** 站点正式地址：必须带协议、带 www */
export const SITE_URL = 'https://www.zhang-wentao.tech';

/** 由 SITE_URL 自动解析；不要手改 */
export const SITE_HOSTNAME = new URL(SITE_URL).hostname;

/** 裸域（apex），由 SITE_URL 自动去掉 www 前缀 */
export const SITE_DOMAIN = SITE_HOSTNAME.replace(/^www\./, '');

/** 裸域自动补 www，由 src/proxy.ts 执行 */
export const SITE_WWW_REDIRECT = {
  enabled: true,
  /** 308 保留请求方法与请求体；301 会被浏览器永久缓存 */
  statusCode: 308 as const,
} as const;

/** `<html lang>` 与 sitemap 的 languageAlternate */
export const SITE_LANG = 'zh-CN';
/** Open Graph 使用的 locale（下划线格式） */
export const SITE_LOCALE = 'zh_CN';

/** 浏览器标签页标题、结构化数据 name */
export const SITE_NAME = '张文涛 · 个人主页';
/** meta description 与 manifest description */
export const SITE_DESCRIPTION = '张文涛的个人主页，分享全栈开发、开源项目与技术实践。';
/** meta keywords */
export const SITE_KEYWORDS = ['张文涛', '个人主页', '全栈开发', '开源项目', 'Web 开发'];
/** 首页副标题签名（打字机文案） */
export const SITE_SIGNATURE = '分享 · 开源 · 实践';

/** 结构化数据与页脚使用的真实姓名 */
export const SITE_AUTHOR_NAME = '张文涛';
export const SITE_JOB_TITLE = '全栈开发者';
/** 页脚英文职称 */
export const SITE_JOB_TITLE_EN = 'Full Stack Developer';
/** JSON-LD knowsAbout */
export const SITE_KNOWS_ABOUT = ['全栈开发', '开源项目', 'Web 开发'] as const;

/** ICP 备案号。留空则页脚不渲染备案区块 */
export const ICP_NUMBER = '晋ICP备2026019630号';
/** 备案号查询页 */
export const ICP_LINK = 'https://beian.miit.gov.cn/';

/** 版权起始年份 */
export const SITE_COPYRIGHT_START = 2016;

/** 调用微信 / 支付宝网关时携带的 User-Agent */
export const SITE_USER_AGENT = 'zhang-wentao-site/1.0';

/** 社交链接，留空时对应入口不跳转 */
export const SITE_SOCIAL_LINKS = {
  blog: '',
  github: '',
} as const;
