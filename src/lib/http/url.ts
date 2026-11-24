/** 只允许 http/https 的目标地址，挡掉 file:、gopher: 等协议走私 */
export function isHttpUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
