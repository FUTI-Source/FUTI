import fs from "node:fs";
import path from "node:path";
import { decompress } from "wawoff2";

type OgWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export type OgFont = { name: string; data: Buffer; weight: OgWeight; style: "normal" };

const ttfCache = new Map<string, Buffer>();

/**
 * 供 next/og（satori）使用的思源宋体静态实例。
 * satori 不支持 woff2 签名，且无法处理变量字体（fvar/gvar），
 * 因此使用 @fontsource 按字重实例化的静态字体（简体中文全量 + 拉丁），
 * woff2 在内存中解压为 TTF 后传入，结果缓存。
 */
export async function loadOgFonts(weights: OgWeight[] = [400, 900]): Promise<OgFont[]> {
  const filesDir = path.join(process.cwd(), "node_modules", "@fontsource", "noto-serif-sc", "files");
  const fonts: OgFont[] = [];
  for (const weight of weights) {
    for (const subset of ["chinese-simplified", "latin"]) {
      const file = path.join(filesDir, `noto-serif-sc-${subset}-${weight}-normal.woff2`);
      let data = ttfCache.get(file);
      if (!data) {
        data = Buffer.from(await decompress(fs.readFileSync(file)));
        ttfCache.set(file, data);
      }
      fonts.push({ name: "Noto Serif SC", data, weight, style: "normal" });
    }
  }
  if (fonts.length === 0) throw new Error("未找到 OG 字体文件");
  return fonts;
}
