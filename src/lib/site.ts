/**
 * 站点集中配置。
 * 站点名称、描述、域名、联系方式、备案号、打赏、邮件与统计等需要调整时，只改这里。
 * 注意：本文件会被客户端组件引用，切勿写入任何密钥或授权码。
 */

export const SITE_URL = 'https://www.zhang-wentao.tech';
/** 完整主机名，含 www */
export const SITE_HOSTNAME = new URL(SITE_URL).hostname;
/** 根域名，不含 www；用于展示及根域到 www 的重定向 */
export const SITE_DOMAIN = SITE_HOSTNAME.replace(/^www\./, '');

export const SITE_LANG = 'zh-CN';
export const SITE_LOCALE = 'zh_CN';

export const SITE_NAME = '张文涛 · 个人主页';
export const SITE_DESCRIPTION = '张文涛的个人主页，分享全栈开发、开源项目与技术实践。';
export const SITE_KEYWORDS = ['张文涛', '个人主页', '全栈开发', '开源项目', 'Web 开发'];
/** 首页副标题签名 */
export const SITE_SIGNATURE = '分享 · 开源 · 实践';
/** 左下角水印品牌字 */
export const SITE_BRAND = 'MINE';

export const SITE_AUTHOR_NAME = '张文涛';
export const SITE_JOB_TITLE = '全栈开发者';
export const SITE_JOB_TITLE_EN = 'Full Stack Developer';
export const SITE_KNOWS_ABOUT = ['全栈开发', '开源项目', 'Web 开发'] as const;

/** Twitter/X 账号，不含 @；留空则不输出 twitter site/creator */
export const SITE_TWITTER_HANDLE = '';

export const CONTACT_EMAIL = 'mine@139.com';

/**
 * 备案号与备案查询页链接。
 * 优先读取环境变量 NEXT_PUBLIC_ICP_NUMBER，留空则不显示备案信息；
 * 未配置时回退到下方硬编码默认值，便于本地开发与预览。
 */
export const ICP_NUMBER =
  (process.env.NEXT_PUBLIC_ICP_NUMBER ?? '晋ICP备2026019630号').trim() || '';
export const ICP_LINK =
  process.env.NEXT_PUBLIC_ICP_LINK?.trim() || 'https://beian.miit.gov.cn/';

/** SEO 与分享图资源 */
export const SITE_ICON_PATH = '/favicon.ico';
export const SITE_IMAGE_PATH = '/icon-192x192.png';
/** Bark 等推送通知使用的图标，必须是可公网访问的地址 */
export const SITE_NOTIFICATION_ICON = `${SITE_URL}${SITE_IMAGE_PATH}`;
/** 通知点击后的邮箱入口：iOS 通过通用链接唤起 App，桌面端打开网页版 */
export const SITE_MAILBOX = {
  /** y.10086.cn 配置了 139 邮箱的通用链接，未安装 App 时打开移动版网页 */
  ios: 'https://y.10086.cn/',
  /** 电脑端网页版 */
  desktop: 'https://mail.10086.cn/',
};
/** 分享卡片图，1200×630，各平台（微信/QQ/Twitter）通用 */
export const SITE_SOCIAL_IMAGE = {
  path: '/og-image.png',
  width: 1200,
  height: 630,
  type: 'image/png',
} as const;

/** 打赏金额范围（元） */
export const DONATION_MIN_AMOUNT = 1;
export const DONATION_MAX_AMOUNT = 10000;
/** 支付订单标题 */
export const DONATION_SUBJECT = '打赏支持';

/** 邮件服务默认值，密钥仍由环境变量提供 */
export const SITE_MAIL_PROVIDER = '139 邮箱';
export const SITE_MAIL_SMTP_HOST = 'smtp.139.com';
export const SITE_MAIL_SMTP_PORT = 465;
export const SITE_MAIL_OWNER_SUBJECT_PREFIX = '网站留言';
export const SITE_MAIL_CONFIRM_SUBJECT = '留言提交成功 · 我们已收到你的消息';
export const SITE_MAIL_HOME_CTA = '返回个人主页';

/** 页脚版权起始年份 */
export const SITE_COPYRIGHT_START = 2017;
/** 页脚主题署名 */
export const SITE_THEME_CREDIT = 'Drawn by NAVILAB';
export const SITE_THEME_CREDIT_HOVER = 'Drawn by Navigator Kepler';

export const SITE_ANALYTICS_URL = 'https://umami.zhang-wentao.tech';
export const SITE_ANALYTICS_WEBSITE_ID = 'c53b1321-886d-4d04-b4a1-4c2010db6735';
/** 统计需要排除的域名列表 */
export const SITE_ANALYTICS_DOMAINS = `${SITE_HOSTNAME},${SITE_DOMAIN}`;

/** 调用支付网关时使用的 User-Agent */
export const SITE_USER_AGENT = 'zhang-wentao-site/1.0';

export interface SiteSocialLinks {
  blog: string;
  github: string;
}

/** 社交链接，留空时对应入口不跳转，也不会写入结构化数据 */
export const SITE_SOCIAL_LINKS: SiteSocialLinks = {
  blog: '',
  github: '',
};
