import type { MetadataRoute } from "next";
import { getAllPosts, PER_PAGE } from "@/lib/content";
import { site } from "@/lib/site.config";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const totalPages = Math.max(1, Math.ceil(posts.length / PER_PAGE));
  const now = new Date();

  const urls: MetadataRoute.Sitemap = [
    { url: site.url, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/tags`, lastModified: now, priority: 0.7 },
  ];

  for (let p = 2; p <= totalPages; p++) {
    urls.push({ url: `${site.url}/page/${p}`, lastModified: now, priority: 0.6 });
  }
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
