import { createHmac, timingSafeEqual } from 'node:crypto';

import { getOrderTokenSecret } from '@/config/env';

import type { DonateChannel } from '../types';

/** 令牌有效期：覆盖前端 5 分钟轮询与 H5 回跳；比原 1 小时更短，减少令牌被重放的窗口 */
const TOKEN_TTL_SECONDS = 10 * 60;
const TOKEN_VERSION = 1;

interface OrderTokenPayload {
  orderId: string;
  channel: DonateChannel;
  /** 金额的最小货币单位：人民币为分，PayPal 为其币种的分 */
  amountFen: number;
  /** PayPal 网关订单号：查询 PayPal 订单时必需 */
  paypalOrderId?: string;
}

/** 令牌内部用短字段序列化，减少 URL 长度 */
interface SignedPayload {
  v: number;
  e: number;
  o: string;
  c: DonateChannel;
  a: number;
  p?: string;
}

export const isOrderTokenConfigured = (): boolean => Boolean(getOrderTokenSecret());

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

/** 把订单信息签成无状态令牌，服务端无需落库即可在查单时还原 */
export function createOrderToken(payload: OrderTokenPayload): string {
  const secret = getOrderTokenSecret();
  if (!secret) throw new Error('无法获取订单令牌签名密钥：请配置 DONATION_ORDER_SECRET 或确保支付私钥可用');

  const body: SignedPayload = {
    v: TOKEN_VERSION,
    e: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    o: payload.orderId,
    c: payload.channel,
    a: payload.amountFen,
    ...(payload.paypalOrderId ? { p: payload.paypalOrderId } : {}),
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString('base64url');
  return `${encoded}.${sign(encoded, secret)}`;
}

/**
 * 校验签名与有效期，失败返回 null。
 *
 * 严格校验令牌为「<payload>.<sig>」两段式：多段或单段一律视为无效，
 * 避免攻击者通过附加额外段绕过签名校验（即便当前签名算法本身不受影响）。
 */
export function verifyOrderToken(token: string): OrderTokenPayload | null {
  const secret = getOrderTokenSecret();
  if (!secret) return null;

  const segments = token.split('.');
  if (segments.length !== 2) return null;
  const [encoded, signature] = segments;
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
    if (body.c !== 'alipay' && body.c !== 'wechat' && body.c !== 'paypal') return null;
    if (body.c === 'paypal' && typeof body.p !== 'string') return null;
    if (typeof body.o !== 'string' || !body.o) return null;
    if (!Number.isInteger(body.a) || body.a <= 0) return null;

    return {
      orderId: body.o,
      channel: body.c,
      amountFen: body.a,
      ...(body.p ? { paypalOrderId: body.p } : {}),
    };
  } catch {
    return null;
  }
}
