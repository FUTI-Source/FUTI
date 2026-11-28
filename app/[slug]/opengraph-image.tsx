import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/content";
import { site } from "@/lib/site.config";
import { formatDate, readingMinutes } from "@/lib/format";
import { loadOgFonts } from "@/lib/og";

export const runtime = "nodejs";
export const size = { width: site.og.width, height: site.og.height };
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
          backgroundColor: site.colors.background,
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
              backgroundColor: site.colors.brand,
              borderRadius: 20,
              color: site.colors.background,
              fontSize: 54,
              fontWeight: 900,
            }}
          >
            {site.sealChar}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 34, fontWeight: 900, color: site.colors.heading, letterSpacing: 3 }}>
              {site.title}
            </div>
            <div style={{ fontSize: 18, color: site.colors.muted, letterSpacing: 8, marginTop: 8 }}>
              {site.alternateName.toUpperCase()}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ width: 120, height: 8, backgroundColor: site.colors.brand, borderRadius: 4, marginBottom: 36 }} />
          <div style={{ fontSize: titleSize, fontWeight: 900, color: site.colors.heading, lineHeight: 1.25 }}>{title}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 18, fontSize: 24, color: site.colors.muted }}>
            <span>{metaText}</span>
          </div>
          <div style={{ fontSize: 22, color: site.colors.brand, letterSpacing: 1 }}>{site.domain}</div>
        </div>
      </div>
    ),
    { ...size, fonts: await loadOgFonts() }
  );
}
