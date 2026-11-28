"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/lib/site.config";
import type { Post } from "@/lib/content";
import { ArticleCard } from "./ArticleCard";

/**
 * 首页文章信息流：服务端渲染首批卡片，滚动到底部附近自动加载下一批
 * （无独立分页路由，URL 保持干净）。
 */
export function PostFeed({ posts }: { posts: Post[] }) {
  const batch = site.feedBatchSize;
  // site 为 as const，feedBatchSize 是字面量类型 9，需显式放宽为 number
  const [visibleCount, setVisibleCount] = useState<number>(batch);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = visibleCount < posts.length;

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    // 提前 400px 开始加载，滚到底部前新卡片已就绪；
    // 每次加载后重建观察器，若哨兵仍在视口内会立即续载下一批
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => Math.min(posts.length, count + batch));
        }
      },
      { rootMargin: "400px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, posts.length, batch, visibleCount]);

  const batches = Array.from(
    { length: Math.ceil(visibleCount / batch) },
    (_, index) => posts.slice(index * batch, (index + 1) * batch)
  );

  return (
    <div className="container">
      {batches.map((group, index) => (
        <div className="row animate" key={index}>
          {group.map((post) => (
            <ArticleCard key={post.slug} post={post} />
          ))}
        </div>
      ))}
      {hasMore ? (
        <div ref={sentinelRef} aria-hidden="true" />
      ) : (
        <p className="feed-end">共 {posts.length} 篇文章 · 已全部加载</p>
      )}
    </div>
  );
}
