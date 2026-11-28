import Link from "next/link";
import { getPaginatedPosts, getAllTags, getPostsByTag } from "@/lib/content";
import { PostList } from "@/components/post/PostList";
import { Pagination } from "@/components/post/Pagination";
import { MencaImage } from "@/components/ui/MencaImage";
import { EmptyState } from "@/components/ui/EmptyState";

export default function HomePage() {
  const { posts, totalPages } = getPaginatedPosts(1);
  const tags = getAllTags().slice(0, 5);

  return (
    <>
      <div className="container">
        {posts.length === 0 ? (
          <EmptyState
            title="暂无文章"
            subtitle="No posts yet — new content is on the way."
          />
        ) : (
          <PostList posts={posts} />
        )}
      </div>
      <Pagination currentPage={1} totalPages={totalPages} />
      {tags.length > 0 ? (
        <section className="section section-tags">
          <div className="container">
            <div className="row">
              <div className="col col-12">
                <div className="section__head">
                  <h3 className="section__title">Tags</h3>
                  <Link href="/tags" className="section__link">See all</Link>
                </div>
                <div className="row">
                  {tags.map(({ tag }) => {
                    const image = getPostsByTag(tag).find((post) => post.image)?.image;
                    return (
                      <div className="col col-3 col-d-6 col-m-12" key={tag}>
                        <Link href={`/tags#${encodeURIComponent(tag)}`} className="tag-image">
                          <span className="tag-name">{tag}</span>
                          {image ? <MencaImage src={image} alt={tag} /> : null}
                        </Link>
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
