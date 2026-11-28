import type { Metadata } from "next";
import { getAllTags, getPostsByTag } from "@/lib/content";
import { site } from "@/lib/site.config";
import { Tags as TagsIcon } from "lucide-react";
import { ArticleCard } from "@/components/post/ArticleCard";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "标签",
  description: `浏览${site.title}的全部标签与相关文章。`,
  alternates: { canonical: `${site.url}/tags` },
};

export default function TagsPage() {
  const tags = getAllTags();

  if (tags.length === 0) {
    return (
      <div className="container">
        <EmptyState
          title="暂无标签"
          subtitle="还没有标签，文章发布后会自动归类到这里。"
          icon={<TagsIcon className="h-12 w-12" strokeWidth={1.5} aria-hidden="true" />}
        />
      </div>
    );
  }

  return (
    <section className="tags">
      <div className="tag__head">
        <div className="container">
          <div className="row">
            <div className="col col-12">
              <h1 className="tag__title">标签</h1>
              <ul className="tag__list list-reset">
                {tags.map(({ tag }) => (
                  <li className="tag__item" key={tag}>
                    <a href={`#${encodeURIComponent(tag)}`} className="tag__link">{tag}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      {tags.map(({ tag, count }) => {
        const posts = getPostsByTag(tag);
        return (
          <div className="tags__inner" key={tag}>
            <div className="container">
              <div className="row">
                <div className="col col-12">
                  <div className="tag__info">
                    <div className="tag__info-box">
                      <div className="tag__counter">
                        <span>{count}</span>
                        <small>篇文章</small>
                      </div>
                      <h2 className="tag__name" id={encodeURIComponent(tag)}>{tag}</h2>
                    </div>
                    <a className="top__link" href="#top">回到顶部</a>
                  </div>
                </div>
              </div>
            </div>
            <div className="container">
              <div className="row">
                <div className="col col-12">
                  <div className="row">
                    {posts.map((post) => <ArticleCard key={post.slug} post={post} />)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
