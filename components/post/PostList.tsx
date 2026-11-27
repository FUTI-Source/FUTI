import type { Post } from "@/lib/content";
import { ArticleCard } from "./ArticleCard";

export function PostList({ posts }: { posts: Post[] }) {
  return (
    <div className="row animate">
      {posts.map((post) => (
        <ArticleCard key={post.slug} post={post} />
      ))}
    </div>
  );
}
