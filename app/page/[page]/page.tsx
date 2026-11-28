import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getAllTags, getPaginatedPosts, getPostsByTag, PER_PAGE } from "@/lib/content";
import { site } from "@/lib/site.config";
import { PostList } from "@/components/post/PostList";
import { Pagination } from "@/components/post/Pagination";
import { MencaImage } from "@/components/ui/MencaImage";

export const dynamicParams = false;

export function generateStaticParams() {
  const total = Math.max(1, Math.ceil(getAllPosts().length / PER_PAGE));
  return Array.from({ length: Math.max(0, total - 1) }, (_, index) => ({ page: String(index + 2) }));
}

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  return {
    title: `第 ${page} 页`,
    description: `浏览${site.title}的早期文章。`,
  };
}

export default async function PaginatedPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const pageNumber = Number(page);
  const { posts, totalPages, currentPage } = getPaginatedPosts(pageNumber);
  if (!Number.isInteger(pageNumber) || pageNumber < 2 || pageNumber > totalPages) notFound();
  const tags = getAllTags().slice(0, 5);

  return (
    <>
      <div className="container">
        <PostList posts={posts} />
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} />
      <section className="section section-tags">
        <div className="container">
          <div className="row">
            <div className="col col-12">
              <div className="section__head">
                <h3 className="section__title">标签</h3>
                <Link href="/tags" className="section__link">查看全部</Link>
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
    </>
  );
}
