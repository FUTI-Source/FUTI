import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/content";
import { site } from "@/lib/site.config";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  // 未配置站点地址时无法生成绝对 URL，返回空集合避免构建报错
  if (!site.url) return [];
  const posts = getAllPosts();
  const now = new Date();

  const urls: MetadataRoute.Sitemap = [
    { url: site.url, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/tags`, lastModified: now, priority: 0.7 },
  ];

  for (const post of posts) {
    urls.push({
      url: `${site.url}/${post.slug}`,
      lastModified: post.date,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }
  return urls;
}
