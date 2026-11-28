import Link from "next/link";
import { getAllPosts } from "@/lib/content";
import { ArticleCard } from "@/components/post/ArticleCard";

export default function NotFound() {
  const recentPosts = getAllPosts().slice(0, 3);

  return (
    <>
      <div className="page-head animate">
        <div className="container">
          <div className="row">
            <div className="col col-12">
              <div className="page__info">
                <h1 className="page__title">404</h1>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="container animate">
        <article className="page">
          <div className="page__content">
            <div className="container">
              <div className="row">
                <div className="col col-12">
                  <div className="error">
                    <h2 className="error__title">404</h2>
                    <p className="error__text">抱歉，你访问的页面不存在。</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
      <div className="recent-posts animate">
        <div className="container">
          <div className="row">
            <div className="col col-12">
              <div className="section__head">
                <h2 className="section__title">最新文章</h2>
                <Link className="section__link" href="/">返回首页</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="container">
          <div className="row">
            {recentPosts.map((post) => <ArticleCard key={post.slug} post={post} />)}
          </div>
        </div>
      </div>
    </>
  );
}
