import { getAllPosts } from "@/lib/content";
import { PostFeed } from "@/components/post/PostFeed";
import { EmptyState } from "@/components/ui/EmptyState";

export default function HomePage() {
  const posts = getAllPosts();

  return posts.length === 0 ? (
    <div className="container">
      <EmptyState
        title="暂无文章"
        subtitle="还没有文章，新内容很快就会到来。"
      />
    </div>
  ) : (
    <PostFeed posts={posts} />
  );
}
