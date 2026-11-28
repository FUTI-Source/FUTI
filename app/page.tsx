import { getAllPosts, getAllTags, getPostsByTag } from "@/lib/content";
import { PostFeed } from "@/components/post/PostFeed";
import { MencaImage } from "@/components/ui/MencaImage";
import { EmptyState } from "@/components/ui/EmptyState";

export default function HomePage() {
  const posts = getAllPosts();
  const tags = getAllTags().slice(0, 5);

  return (
    <>
      {posts.length === 0 ? (
        <div className="container">
          <EmptyState
            title="暂无文章"
            subtitle="还没有文章，新内容很快就会到来。"
          />
        </div>
      ) : (
        <PostFeed posts={posts} />
      )}
      {tags.length > 0 ? (
        <section className="section section-tags animate">
          <div className="container">
            <div className="row">
              <div className="col col-12">
                <div className="section__head">
                  <h3 className="section__title">标签</h3>
                  <a href="/tags" className="section__link">查看全部</a>
                </div>
                <div className="row">
                  {tags.map(({ tag }) => {
                    const image = getPostsByTag(tag).find((post) => post.image)?.image;
                    return (
                      <div className="col col-3 col-d-6 col-m-12" key={tag}>
                        <a href={`/tags#${encodeURIComponent(tag)}`} className="tag-image">
                          <span className="tag-name">{tag}</span>
                          {image ? <MencaImage src={image} alt={tag} /> : null}
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
