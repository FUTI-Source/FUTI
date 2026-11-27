import { getAllPosts } from "../lib/content";
import { site } from "../lib/site.config";
import fs from "node:fs";
import path from "node:path";

const PUBLIC = path.join(process.cwd(), "public");
const posts = getAllPosts();

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function plainText(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// --- search.json（客户端搜索索引） ---
const searchIndex = posts.map((p) => ({
  title: p.title,
  category: p.category ?? "",
  tags: p.tags,
  url: `/${p.slug}`,
  date: p.date.toISOString(),
  description: p.description ?? "",
  image: p.image ?? "",
  content: plainText(p.content),
}));
fs.mkdirSync(PUBLIC, { recursive: true });
fs.writeFileSync(
  path.join(PUBLIC, "search.json"),
  JSON.stringify(searchIndex, null, 2)
);

// --- feed.xml（RSS 2.0） ---
const items = posts
  .map((p) => {
    const link = `${site.url}/${p.slug}`;
    const categories = p.tags.map((t) => `      <category>${esc(t)}</category>`).join("\n");
    return `    <item>
      <title>${esc(p.title)}</title>
      <description>${esc(p.description ?? plainText(p.content).slice(0, 280))}</description>
      <pubDate>${p.date.toUTCString()}</pubDate>
      <link>${esc(link)}</link>
      <guid isPermaLink="true">${esc(link)}</guid>
${categories}
    </item>`;
  })
  .join("\n");

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(site.title)}</title>
    <description>${esc(site.description)}</description>
    <link>${esc(site.url)}/</link>
    <atom:link href="${esc(site.url)}/feed.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
fs.writeFileSync(path.join(PUBLIC, "feed.xml"), rss);

console.log(
  `Generated public/search.json (${searchIndex.length} posts) and public/feed.xml`
);
