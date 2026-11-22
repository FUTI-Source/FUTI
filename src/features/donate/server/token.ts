import { createHmac, timingSafeEqual } from 'node:crypto';

import type { DonateChannel } from '../types';

/** 令牌有效期，覆盖前端 5 分钟轮询与 H5 回跳 */
const TOKEN_TTL_SECONDS = 60 * 60;
const TOKEN_VERSION = 1;

export interface OrderTokenPayload {
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

function getSecret(): string | null {
  const secret = process.env.DONATION_ORDER_SECRET?.trim();
  return secret || null;
}

export const isOrderTokenConfigured = (): boolean => Boolean(getSecret());

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

/** 把订单信息签成无状态令牌，服务端无需落库即可在查单时还原 */
export function createOrderToken(payload: OrderTokenPayload): string {
  const secret = getSecret();
  if (!secret) throw new Error('未配置 DONATION_ORDER_SECRET');

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
