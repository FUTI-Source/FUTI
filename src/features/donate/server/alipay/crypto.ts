import { createSign, createVerify } from 'node:crypto';

const PRIVATE_KEY_BEGIN = '-----BEGIN PRIVATE KEY-----';
const PRIVATE_KEY_END = '-----END PRIVATE KEY-----';
const PUBLIC_KEY_BEGIN = '-----BEGIN PUBLIC KEY-----';
const PUBLIC_KEY_END = '-----END PUBLIC KEY-----';

/** 兼容环境变量里的 \n 转义与不带 PEM 头的裸密钥 */
function normalizePrivateKey(value: string): string {
  const key = value.trim().replace(/\\n/g, '\n');
  if (key.includes('-----BEGIN')) return key;
  return `${PRIVATE_KEY_BEGIN}\n${key.replace(/\s+/g, '')}\n${PRIVATE_KEY_END}`;
}

function normalizePublicKey(value: string): string {
  const key = value.trim().replace(/\\n/g, '\n');
  if (key.includes('-----BEGIN')) return key;
  return `${PUBLIC_KEY_BEGIN}\n${key.replace(/\s+/g, '')}\n${PUBLIC_KEY_END}`;
}

/** 支付宝签名串：排除 sign 与 sign_type，按参数名升序拼接 */
function buildSignContent(params: Record<string, string | undefined>): string {
  return Object.keys(params)
    .filter((key) => key !== 'sign' && key !== 'sign_type')
    .filter((key) => {
      const value = params[key];
      return value !== undefined && value !== '';
    })
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
}

export function signParams(
  params: Record<string, string | undefined>,
  privateKey: string,
): string {
  const signer = createSign('RSA-SHA256');
  signer.update(buildSignContent(params), 'utf8');
  signer.end();
  return signer.sign(normalizePrivateKey(privateKey), 'base64');
}

export function verifyParams(params: Record<string, string>, publicKey: string): boolean {
  const sign = params.sign;
  if (!sign) return false;

  const verifier = createVerify('RSA-SHA256');
  verifier.update(buildSignContent(params), 'utf8');
  verifier.end();

  try {
    return verifier.verify(normalizePublicKey(publicKey), sign, 'base64');
  } catch {
    return false;
  }
}

/** 支付宝要求北京时间 yyyy-MM-dd HH:mm:ss */
export function formatTimestamp(date = new Date()): string {
  const shanghai = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    `${shanghai.getUTCFullYear()}-${pad(shanghai.getUTCMonth() + 1)}-${pad(shanghai.getUTCDate())}`,
    `${pad(shanghai.getUTCHours())}:${pad(shanghai.getUTCMinutes())}:${pad(shanghai.getUTCSeconds())}`,
  ].join(' ');
}

/** RFC3986 编码，避免 !'()* 未转义导致验签失败 */
function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export function buildGatewayUrl(input: {
  gateway: string;
  appId: string;
  method: string;
  bizContent: Record<string, unknown>;
  privateKey: string;
  notifyUrl?: string;
  returnUrl?: string;
  timestamp?: string;
}): string {
  const params: Record<string, string | undefined> = {
    app_id: input.appId,
    method: input.method,
    format: 'JSON',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: input.timestamp ?? formatTimestamp(),
    version: '1.0',
    notify_url: input.notifyUrl,
    return_url: input.returnUrl,
    biz_content: JSON.stringify(input.bizContent),
  };

  const sign = signParams(params, input.privateKey);
  const query = Object.entries({ ...params, sign })
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value as string)}`)
    .join('&');

  return `${input.gateway}?${query}`;
}
