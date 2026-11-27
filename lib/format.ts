export function formatDate(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return String(input);
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function toISO(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

/** 从 Markdown 正文生成纯文本摘要，用于文章卡片。 */
export function makeExcerpt(markdown: string, words = 28): string {
  const text = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 链接保留文字
    .replace(/^#{1,6}\s+/gm, " ")
    .replace(/[>*_`~-]/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  const arr = text.split(" ");
  return arr.length > words ? arr.slice(0, words).join(" ") + "…" : text;
}
