import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { getPostBySlug, getPostSlugs } from "@/lib/content";
import { site } from "@/lib/site.config";
import { formatDate, readingMinutes, toISO } from "@/lib/format";
import { Markdown } from "@/components/ui/Markdown";
import { MencaImage } from "@/components/ui/MencaImage";
import { RelatedPosts } from "@/components/post/RelatedPosts";

export const dynamicParams = false;

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  const url = site.url ? `${site.url}/${slug}` : undefined;
  return {
    title: post.title,
    description: post.description ?? site.description,
    ...(url ? { alternates: { canonical: url } } : {}),
    openGraph: {
      title: post.title,
      description: post.description ?? site.description,
      ...(url ? { url } : {}),
      type: "article",
      publishedTime: post.date.toISOString(),
      authors: [site.title],
      tags: post.tags,
    },
    // Slack / Telegram / Discord 的富字段（twitter:label/value）
    other: {
      "twitter:label1": "阅读时长",
      "twitter:value1": `约 ${readingMinutes(post.content)} 分钟`,
      "twitter:label2": "发布日期",
      "twitter:value2": formatDate(post.date),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description ?? site.description,
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.description ?? site.description,
            datePublished: toISO(post.date),
            inLanguage: "zh-CN",
            author: { "@type": "Person", name: site.title, ...(site.url ? { url: site.url } : {}) },
            ...(post.image ? { image: `${site.url}${post.image}` } : {}),
            mainEntityOfPage: { "@type": "WebPage", "@id": `${site.url}/${post.slug}` },
          }),
        }}
      />
      <div className="post-head animate">
        <div className="container">
          {post.videoEmbed ? (
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
          ) : post.image ? (
            <div className="post-image">
              <MencaImage src={post.image} alt={post.title} eager />
            </div>
          ) : null}
          <div className="post__info">
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
              <div className="post__meta-bottom">
                <time className="post__date" dateTime={toISO(post.date)}>
                  {formatDate(post.date)}
                </time>
                <span className="post__reading">
                      <Clock aria-hidden="true" strokeWidth={1.75} />
                  约 {readingMinutes(post.content)} 分钟读完
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="container animate">
        <article className="post">
          <Markdown>{post.content}</Markdown>
        </article>
      </div>
      <RelatedPosts post={post} />
    </>
  );
}
