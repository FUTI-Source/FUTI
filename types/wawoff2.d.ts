declare module "wawoff2" {
  /** 将 woff2 字体解压为原始 TTF/OTF 字节。 */
  export function decompress(input: Uint8Array | Buffer): Promise<Uint8Array>;
  /** 将 TTF/OTF 字体压缩为 woff2。 */
  export function compress(input: Uint8Array | Buffer): Promise<Uint8Array>;
}
