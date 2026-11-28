import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/content";
import { site } from "@/lib/site.config";
import { formatDate, readingMinutes, toISO } from "@/lib/format";
import { loadOgFonts } from "@/lib/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateImageMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  return [
    {
      id: "card",
      alt: `${post?.title ?? site.title} — ${site.title}`,
      size,
      contentType,
    },
  ];
}

/** 文章级 Open Graph 分享卡：标题 + 日期/阅读时长，按文章自动生成。 */
export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const title = post?.title ?? site.title;
  const titleSize = title.length > 22 ? 54 : title.length > 14 ? 62 : 72;
  const metaText = post ? `${formatDate(post.date)} · 约 ${readingMinutes(post.content)} 分钟读完` : site.description;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundColor: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 96,
              height: 96,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#0073ec",
              borderRadius: 20,
              color: "#ffffff",
              fontSize: 54,
              fontWeight: 900,
            }}
          >
            文
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 34, fontWeight: 900, color: "#1e2740", letterSpacing: 3 }}>{site.title}</div>
            <div style={{ fontSize: 18, color: "#716f8a", letterSpacing: 8, marginTop: 8 }}>ZHANG WENTAO</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ width: 120, height: 8, backgroundColor: "#0073ec", borderRadius: 4, marginBottom: 36 }} />
          <div style={{ fontSize: titleSize, fontWeight: 900, color: "#1e2740", lineHeight: 1.25 }}>{title}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 18, fontSize: 24, color: "#716f8a" }}>
            <span>{metaText}</span>
          </div>
          <div style={{ fontSize: 22, color: "#0073ec", letterSpacing: 1 }}>www.zhang-wentao.tech</div>
        </div>
      </div>
    ),
    { ...size, fonts: await loadOgFonts() }
  );
}
