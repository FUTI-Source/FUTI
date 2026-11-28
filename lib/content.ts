import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { site } from "./site.config";

const ROOT = process.cwd();
// 文章直接位于 content/ 目录
const POSTS_DIR = path.join(ROOT, "content");

export interface Post {
  slug: string;
  title: string;
  date: Date;
  description?: string;
  image?: string;
  tags: string[];
  category?: string;
  videoEmbed?: string;
  content: string;
}

function normalizeImage(p?: string): string | undefined {
  if (!p) return undefined;
  if (/^https?:\/\//i.test(p) || p.startsWith("data:")) return p;
  return p.startsWith("/") ? p : `/${p}`;
}

function toTags(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((t) => String(t));
  return String(raw)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function slugFromFilename(file: string): string {
  const base = file.replace(/\.md$/i, "");
  // 去掉文件名前缀的日期 YYYY-M-D-（Jekyll 允许月/日不补零），对应原 permalink /:title
  return base.replace(/^\d{4}-\d{1,2}-\d{1,2}-/, "");
}

function parseDate(raw: unknown): Date {
  if (raw instanceof Date) return raw;
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

function readPostFile(file: string): Post {
  const full = path.join(POSTS_DIR, file);
  const { data, content } = matter(fs.readFileSync(full, "utf8"));
  return {
    slug: slugFromFilename(file),
    title: String(data.title ?? slugFromFilename(file)),
    date: parseDate(data.date),
    description: data.description ? String(data.description) : undefined,
    image: normalizeImage(data.image ? String(data.image) : undefined),
    tags: toTags(data.tags ?? data.category),
    category: data.category ? String(data.category) : undefined,
    videoEmbed: data.video_embed ? String(data.video_embed) : undefined,
    content,
  };
}

let _posts: Post[] | null = null;
let _postsSignature = "";

// 模块级缓存：用文件名 + 修改时间 + 大小作为签名，文章增删改后自动重新读取
function postsSignature(files: string[]): string {
  return files
    .map((f) => {
      const stat = fs.statSync(path.join(POSTS_DIR, f));
      return `${f}:${stat.mtimeMs}:${stat.size}`;
    })
    .sort()
    .join("|");
}

function loadAllPosts(): Post[] {
  const files = fs.existsSync(POSTS_DIR)
    ? fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"))
    : [];
  const signature = postsSignature(files);
  if (_posts && signature === _postsSignature) return _posts;
  _postsSignature = signature;
  _posts = files
    .map(readPostFile)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  return _posts;
}

export function getAllPosts(): Post[] {
  return loadAllPosts();
}

export function getPostSlugs(): string[] {
  return loadAllPosts().map((p) => p.slug);
}

export function getPostBySlug(slug: string): Post | undefined {
  return loadAllPosts().find((p) => p.slug === slug);
}

export function getAllTags(): { tag: string; count: number }[] {
  const map = new Map<string, number>();
  for (const p of loadAllPosts()) {
    for (const t of p.tags) map.set(t, (map.get(t) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

export function getPostsByTag(tag: string): Post[] {
  return loadAllPosts().filter((p) => p.tags.includes(tag));
}

export function getRelatedPosts(post: Post, limit: number = site.relatedPostsLimit): Post[] {
  const others = loadAllPosts().filter((p) => p.slug !== post.slug);
  const scored = others.map((p) => ({
    p,
    overlap: p.tags.filter((t) => post.tags.includes(t)).length,
  }));
  scored.sort(
    (a, b) =>
      b.overlap - a.overlap || b.p.date.getTime() - a.p.date.getTime()
  );
  return scored
    .filter((s) => s.overlap > 0)
    .slice(0, limit)
    .map((s) => s.p);
}
