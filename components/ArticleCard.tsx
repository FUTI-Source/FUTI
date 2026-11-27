import Link from "next/link";
import type { Post } from "@/lib/content";
import { formatDate, makeExcerpt, toISO } from "@/lib/format";
import { MencaImage } from "./MencaImage";

export function ArticleCard({ post }: { post: Post }) {
  return (
    <article className="article col col-4 col-d-6 col-t-12">
      <div className="article__inner">
        <div className="article__head">
          <time className="article__date" dateTime={toISO(post.date)}>
            {formatDate(post.date)}
          </time>
          {post.videoEmbed ? (
            <div className="video-icon" aria-hidden="true">
              <div className="circle pulse" />
              <div className="circle">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                  <polygon points="40,30 65,50 40,70" />
                </svg>
              </div>
            </div>
          ) : null}
          {post.image ? (
            <Link className="article__image" href={`/${post.slug}`}>
              <MencaImage src={post.image} alt={post.title} />
            </Link>
          ) : null}
        </div>
        <div className="article__content">
          <h2 className="article__title">
            <Link href={`/${post.slug}`}>{post.title}</Link>
          </h2>
          <p className="article__excerpt">
            {post.description ?? makeExcerpt(post.content)}
          </p>
        </div>
      </div>
    </article>
  );
}
