import { NextResponse } from 'next/server';

import type { RateLimitResult } from './rate-limit';

/** 统一的错误响应体：{ error: { code, message } } */
export function jsonError(
  status: number,
  code: string,
  message: string,
  headers?: Record<string, string>,
) {
  return NextResponse.json({ error: { code, message } }, { status, headers });
}

export function rateLimited(result: RateLimitResult, message = '操作过于频繁，请稍后再试') {
  return jsonError(429, 'RATE_LIMITED', message, {
    'Retry-After': String(result.retryAfterSeconds),
  });
}

export type BodyResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

/**
 * 读取并解析 JSON 请求体。
 * 先看 Content-Length 再复核实际字节数：前者可在流阶段就挡掉超大请求，
 * 后者防止头缺失或与实际不一致。
 */
export async function readJsonBody(
  request: Request,
  maxBytes: number,
): Promise<BodyResult<unknown>> {
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return { ok: false, response: jsonError(413, 'PAYLOAD_TOO_LARGE', '请求内容过大') };
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, response: jsonError(400, 'BAD_REQUEST', '请求体不是合法 JSON') };
  }

  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return { ok: false, response: jsonError(413, 'PAYLOAD_TOO_LARGE', '请求内容过大') };
  }

  try {
    return { ok: true, data: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: jsonError(400, 'BAD_REQUEST', '请求体不是合法 JSON') };
  }
}

/** 读取原始请求体（支付回调是表单/JSON 原文，不能先解析） */
export async function readRawBody(
  request: Request,
  maxBytes: number,
): Promise<BodyResult<string>> {
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return { ok: false, response: jsonError(413, 'PAYLOAD_TOO_LARGE', '请求内容过大') };
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, response: jsonError(400, 'BAD_REQUEST', '请求体读取失败') };
  }

  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return { ok: false, response: jsonError(413, 'PAYLOAD_TOO_LARGE', '请求内容过大') };
  }

  return { ok: true, data: text };
}
