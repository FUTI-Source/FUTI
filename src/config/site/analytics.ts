import { SITE_DOMAIN, SITE_HOSTNAME } from './identity';

/** Umami 服务端地址，同时用于 <link rel="preconnect"> */
export const SITE_ANALYTICS_URL = 'https://cloud.umami.is';
/** Umami website id（本身就是公开脚本参数） */
export const SITE_ANALYTICS_WEBSITE_ID = '123ce0ff-afc4-4a61-9435-9face57dbd70';
/** 统计域名白名单，由站点域名自动派生 */
export const SITE_ANALYTICS_DOMAINS = `${SITE_HOSTNAME},${SITE_DOMAIN}`;
