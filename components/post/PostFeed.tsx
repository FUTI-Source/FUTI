"use client";

import { useState } from "react";
import { site } from "@/lib/site.config";
import type { Post } from "@/lib/content";
import { ArticleCard } from "./ArticleCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * 首页文章信息流：服务端渲染全部卡片，客户端按 site.perPage 分页
 * （无独立分页路由，URL 保持干净）。
 */
export function PostFeed({ posts }: { posts: Post[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(posts.length / site.perPage));
  const visible = posts.slice((page - 1) * site.perPage, page * site.perPage);

  return (
    <>
      <div className="container">
        <div className="row animate">
          {visible.map((post) => (
            <ArticleCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
      {totalPages > 1 ? (
        <div className="container">
          <div className="row">
            <div className="col col-12">
              <nav className="pagination" aria-label="分页">
                <div className="pagination__inner">
                  <div className="pagination__list">
                    <button
                      type="button"
                      className="pagination__prev pagination__item"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <i aria-hidden="true">
                        <ChevronLeft strokeWidth={1.75} />
                      </i>{" "}
                      上一页
                    </button>
                    <div className="pagination__count pagination__item">
                      第 {page} / {totalPages} 页
                    </div>
                    <button
                      type="button"
                      className="pagination__next pagination__item"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      下一页{" "}
                      <i aria-hidden="true">
                        <ChevronRight strokeWidth={1.75} />
                      </i>
                    </button>
                  </div>
                </div>
              </nav>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
