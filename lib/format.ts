import { site } from "./site.config";

export function formatDate(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return String(input);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function toISO(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

/** 按中文阅读速度（site.readingCharsPerMinute，默认 400 字/分钟）估算阅读时长（分钟）。 */
export function readingMinutes(markdown: string, charsPerMinute: number = site.readingCharsPerMinute): number {
  const text = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 链接保留文字
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return Math.max(1, Math.round(text.length / charsPerMinute));
}

/** 从 Markdown 正文生成纯文本摘要；中文无空格分词，按字符数截断。 */
export function makeExcerpt(markdown: string, maxChars: number = site.excerptChars): string {
  const text = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 链接保留文字
    .replace(/^#{1,6}\s+/gm, " ")
    .replace(/[>*_`~-]/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  return text.length > maxChars ? text.slice(0, maxChars).trimEnd() + "…" : text;
}
