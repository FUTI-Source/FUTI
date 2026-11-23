import { createHmac, timingSafeEqual } from 'node:crypto';

import type { DonateChannel } from '../types';

/** 令牌有效期，覆盖前端 5 分钟轮询与 H5 回跳 */
const TOKEN_TTL_SECONDS = 60 * 60;
const TOKEN_VERSION = 1;
/** 派生信息串：未显式配置时据此从支付私钥派生订单签名密钥，实现用途隔离 */
const DERIVE_INFO = 'zyf-homepage/donation-order-secret';

interface OrderTokenPayload {
  orderId: string;
  channel: DonateChannel;
  amountFen: number;
}

/** 令牌内部用短字段序列化，减少 URL 长度 */
interface SignedPayload {
  v: number;
  e: number;
  o: string;
  c: DonateChannel;
  a: number;
}

/**
 * 显式配置 DONATION_ORDER_SECRET 优先；否则从支付私钥派生。
 * 派生源（微信/支付宝私钥）是稳定的环境变量，跨 serverless 实例一致，
 * 下单签名与查单验签因此使用同一密钥，无需手动配置。
 */
function getSecret(): string | null {
  const explicit = process.env.DONATION_ORDER_SECRET?.trim();
  if (explicit) return explicit;

  // 固定优先级，保证下单与查单使用同一派生源（不随订单渠道变化）
  const source =
    process.env.WECHAT_PRIVATE_KEY?.trim() ||
    process.env.ALIPAY_PRIVATE_KEY?.trim();
  if (!source) return null;

  return createHmac('sha256', source).update(DERIVE_INFO).digest('hex');
}

export const isOrderTokenConfigured = (): boolean => Boolean(getSecret());

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

/** 把订单信息签成无状态令牌，服务端无需落库即可在查单时还原 */
export function createOrderToken(payload: OrderTokenPayload): string {
  const secret = getSecret();
  if (!secret) throw new Error('无法获取订单令牌签名密钥：请配置 DONATION_ORDER_SECRET 或确保支付私钥可用');

  const body: SignedPayload = {
    v: TOKEN_VERSION,
    e: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    o: payload.orderId,
    c: payload.channel,
    a: payload.amountFen,
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString('base64url');
  return `${encoded}.${sign(encoded, secret)}`;
}

/** 校验签名与有效期，失败返回 null */
export function verifyOrderToken(token: string): OrderTokenPayload | null {
  const secret = getSecret();
  if (!secret) return null;

  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;

  const expected = Buffer.from(sign(encoded, secret));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }

  try {
    const body = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as SignedPayload;

    if (body.v !== TOKEN_VERSION) return null;
    if (!Number.isInteger(body.e) || body.e < Math.floor(Date.now() / 1000)) return null;
    if (body.c !== 'alipay' && body.c !== 'wechat') return null;
    if (typeof body.o !== 'string' || !body.o) return null;
    if (!Number.isInteger(body.a) || body.a <= 0) return null;

    return { orderId: body.o, channel: body.c, amountFen: body.a };
  } catch {
    return null;
  }
}
