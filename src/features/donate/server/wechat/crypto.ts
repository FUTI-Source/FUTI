import { createDecipheriv, createHmac, createSign, createVerify, randomBytes } from 'node:crypto';

interface WechatNotifyHeaders {
  timestamp: string;
  nonce: string;
  signature: string;
  serial: string;
}

export interface WechatNotifyResource {
  algorithm: string;
  ciphertext: string;
  nonce: string;
  associated_data?: string;
}

const TIMESTAMP_TOLERANCE_SECONDS = 300;

/** 环境变量里的私钥/公钥常用 \n 转义换行，这里统一还原 */
function normalizePem(value: string): string {
  return (value.includes('\\n') ? value.replace(/\\n/g, '\n') : value).trim();
}

/** 使用商户私钥做 RSA-SHA256 签名 */
export function signMessage(privateKey: string, message: string): string {
  const signer = createSign('RSA-SHA256');
  signer.update(message);
  signer.end();
  return signer.sign(normalizePem(privateKey), 'base64');
}

/** HMAC-SHA256，用于校验 openid Cookie 是否被篡改 */
export function hmacSha256(secret: string, message: string): string {
  return createHmac('sha256', secret).update(message).digest('hex');
}

/** 生成微信支付 APIv3 的 Authorization 头 */
export function buildAuthorization(input: {
  mchId: string;
  serialNo: string;
  privateKey: string;
  method: string;
  urlPath: string;
  body?: string;
}): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString('hex');
  const message = `${input.method}\n${input.urlPath}\n${timestamp}\n${nonce}\n${input.body ?? ''}\n`;
  const signature = signMessage(input.privateKey, message);

  return [
    `WECHATPAY2-SHA256-RSA2048 mchid="${input.mchId}"`,
    `nonce_str="${nonce}"`,
    `signature="${signature}"`,
    `timestamp="${timestamp}"`,
    `serial_no="${input.serialNo}"`,
  ].join(',');
}

/** 验证微信支付回调签名（公钥模式），失败时抛出异常 */
export function verifyNotifySignature(input: {
  publicKey: string;
  headers: WechatNotifyHeaders;
  body: string;
  now?: number;
}): void {
  const { headers, body } = input;
  if (!headers.timestamp || !headers.nonce || !headers.signature || !headers.serial) {
    throw new Error('回调签名头缺失');
  }

  const now = input.now ?? Math.floor(Date.now() / 1000);
  const timestamp = Number(headers.timestamp);
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) > TIMESTAMP_TOLERANCE_SECONDS) {
    throw new Error('回调时间戳超出允许范围');
  }

  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${headers.timestamp}\n${headers.nonce}\n${body}\n`);
  verifier.end();

  const valid = verifier.verify(
    normalizePem(input.publicKey),
    Buffer.from(headers.signature, 'base64'),
  );
  if (!valid) throw new Error('回调签名验证失败');
}

/** 解密回调 resource 字段（AEAD_AES_256_GCM） */
export function decryptNotifyResource(
  apiV3Key: string,
  resource: WechatNotifyResource,
): unknown {
  if (resource.algorithm !== 'AEAD_AES_256_GCM') {
    throw new Error(`不支持的回调加密算法：${resource.algorithm}`);
  }

  const key = Buffer.from(apiV3Key, 'utf8');
  if (key.length !== 32) throw new Error('APIv3 密钥长度必须为 32 字节');

  const ciphertext = Buffer.from(resource.ciphertext, 'base64');
  if (ciphertext.length <= 16) throw new Error('回调密文长度不合法');

  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(resource.nonce, 'utf8'));
  if (resource.associated_data) {
    decipher.setAAD(Buffer.from(resource.associated_data, 'utf8'));
  }

  const data = ciphertext.subarray(0, ciphertext.length - 16);
  const authTag = ciphertext.subarray(ciphertext.length - 16);

  const decrypted = decipher.update(data);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decrypted, decipher.final()]);

  return JSON.parse(plaintext.toString('utf8'));
}
