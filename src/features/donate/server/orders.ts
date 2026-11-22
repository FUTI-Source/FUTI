import type { DonateChannel, DonationStatus } from '../types';

export interface StoredDonationOrder {
  orderId: string;
  channel: DonateChannel;
  /** 金额，单位为元 */
  amount: number;
  /** 金额，单位为分，提交给支付渠道时使用 */
  amountFen: number;
  status: DonationStatus;
  createdAt: number;
  paidAt?: number;
  transactionId?: string;
}

const ORDER_TTL_SECONDS = 60 * 60 * 24;

interface MemoryState {
  orders: Map<string, StoredDonationOrder>;
  paidClaims: Set<string>;
}

/**
 * 未配置 Redis 时退化为进程内存存储，仅用于本地开发；
 * 生产环境（尤其是多实例的 Serverless）必须配置 Upstash Redis。
 */
const globalState = globalThis as typeof globalThis & {
  __donationMemory?: MemoryState;
};

function getMemoryState(): MemoryState {
  globalState.__donationMemory ??= { orders: new Map(), paidClaims: new Set() };
  return globalState.__donationMemory;
}

interface RedisConfig {
  url: string;
  token: string;
}

function getRedisConfig(): RedisConfig | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null;
}

async function redisCommand(...parts: Array<string | number>): Promise<unknown> {
  const redis = getRedisConfig();
  if (!redis) throw new Error('未配置 Upstash Redis');

  const path = parts.map((part) => encodeURIComponent(String(part))).join('/');
  const response = await fetch(`${redis.url}/${path}`, {
    headers: { Authorization: `Bearer ${redis.token}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Redis 请求失败：${response.status}`);

  const data = (await response.json()) as { result?: unknown; error?: string };
  if (data.error) throw new Error(`Redis 错误：${data.error}`);
  return data.result;
}

const orderKey = (orderId: string) => `donate:order:${orderId}`;
const paidKey = (orderId: string) => `donate:paid:${orderId}`;

export async function saveOrder(order: StoredDonationOrder): Promise<void> {
  if (getRedisConfig()) {
    await redisCommand('set', orderKey(order.orderId), JSON.stringify(order), 'ex', ORDER_TTL_SECONDS);
    return;
  }
  getMemoryState().orders.set(order.orderId, order);
}

export async function getOrder(orderId: string): Promise<StoredDonationOrder | null> {
  if (getRedisConfig()) {
    const raw = await redisCommand('get', orderKey(orderId));
    if (typeof raw !== 'string') return null;
    try {
      return JSON.parse(raw) as StoredDonationOrder;
    } catch {
      return null;
    }
  }
  return getMemoryState().orders.get(orderId) ?? null;
}

/** 返回 true 表示本次调用首次占用「已支付」标记，用于回调幂等 */
export async function claimPaid(orderId: string): Promise<boolean> {
  if (getRedisConfig()) {
    const result = await redisCommand('set', paidKey(orderId), '1', 'ex', ORDER_TTL_SECONDS, 'nx');
    return result === 'OK';
  }

  const state = getMemoryState();
  if (state.paidClaims.has(orderId)) return false;
  state.paidClaims.add(orderId);
  return true;
}
