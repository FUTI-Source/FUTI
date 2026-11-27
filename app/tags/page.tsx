import type { Metadata } from "next";
import { getAllTags, getPostsByTag } from "@/lib/content";
import { site } from "@/lib/site.config";
import { ArticleCard } from "@/components/post/ArticleCard";

export const metadata: Metadata = {
  title: "Tags",
  description: `Browse all posts by tag on ${site.title}.`,
  alternates: { canonical: `${site.url}/tags` },
};

export default function TagsPage() {
  const tags = getAllTags();

  return (
    <section className="tags">
      <div className="tag__head">
        <div className="container">
          <div className="row">
            <div className="col col-12">
              <h1 className="tag__title">Tags</h1>
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
                        <small>{count === 1 ? "Post" : "Posts"}</small>
                      </div>
                      <h2 className="tag__name" id={encodeURIComponent(tag)}>{tag}</h2>
                    </div>
                    <a className="top__link" href="#top">Return to top</a>
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
