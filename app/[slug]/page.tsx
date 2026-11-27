import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, getPostSlugs } from "@/lib/content";
import { site } from "@/lib/site.config";
import { formatDate, toISO } from "@/lib/format";
import { Markdown } from "@/components/Markdown";
import { MencaImage } from "@/components/MencaImage";
import { ShareButtons } from "@/components/ShareButtons";
import { RelatedPosts } from "@/components/RelatedPosts";
import { Disqus } from "@/components/Disqus";

export const dynamicParams = false;

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  const url = `${site.url}/${slug}`;
  const ogImage = post.image ? `${site.url}${post.image}` : undefined;
  return {
    title: post.title,
    description: post.description ?? site.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description ?? site.description,
      url,
      type: "article",
      publishedTime: post.date.toISOString(),
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description ?? site.description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <>
      <div className="post-head">
        <div className="container">
          <div className="row">
            {post.videoEmbed ? (
              <div className="col col-12">
                <div className="post-video">
                  <div className="post-video__wrap">
                    <iframe
                      src={post.videoEmbed}
                      loading="lazy"
                      width="640"
                      height="360"
                      title={post.title}
                      allowFullScreen
                    />
                  </div>
                </div>
              </div>
            ) : post.image ? (
              <div className="col col-6 col-d-12">
                <div className="post-image">
                  <MencaImage src={post.image} alt={post.title} eager />
                </div>
              </div>
            ) : null}
            <div className={`col ${post.videoEmbed ? "col-12" : "col-6 col-d-12"}`}>
              <div className={`post__info${post.videoEmbed ? " post__info-video" : ""}`}>
                {post.tags.length > 0 ? (
                  <div className="post__tags">
                    {post.tags.map((tag) => (
                      <Link href={`/tags#${encodeURIComponent(tag)}`} className="post__tag" key={tag}>
                        {tag}
                      </Link>
                    ))}
                  </div>
                ) : null}
                <h1 className="post__title">{post.title}</h1>
                <div className="post__meta">
                  <Link href="/about" className="post__author-image">
                    <MencaImage src={site.author.avatar} alt={site.author.name} />
                  </Link>
                  <div className="post__meta-bottom">
                    <Link className="post__author" href="/about">{site.author.name}</Link>
                    <time className="post__date" dateTime={toISO(post.date)}>
                      {formatDate(post.date)}
                    </time>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="container animate">
        <article className="post">
          <Markdown>{post.content}</Markdown>
          <ShareButtons
            slug={post.slug}
            title={post.title}
            description={post.description}
            image={post.image}
          />
        </article>
      </div>
      <RelatedPosts post={post} />
      <Disqus slug={post.slug} title={post.title} />
    </>
  );
}
