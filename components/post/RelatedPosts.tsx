import Link from "next/link";
import { getRelatedPosts, type Post } from "@/lib/content";
import { ArticleCard } from "./ArticleCard";

export function RelatedPosts({ post }: { post: Post }) {
  const related = getRelatedPosts(post);
  if (related.length === 0) return null;

  return (
    <div className="container">
      <section className="related-posts is-related animate">
        <div className="row">
          <div className="col col-12">
            <div className="container__inner">
              <div className="section__info">
                <div className="section__head">
                  <h2 className="section__title">推荐阅读</h2>
                  {post.tags[0] ? (
                    <Link href={`/tags#${encodeURIComponent(post.tags[0])}`} className="section__link related-tag">
                      查看全部<span> {post.tags[0]}</span>
                    </Link>
                  ) : null}
                </div>
              </div>
              <div className="row">
                {related.map((relatedPost) => (
                  <ArticleCard key={relatedPost.slug} post={relatedPost} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
