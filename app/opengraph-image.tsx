import { ImageResponse } from "next/og";
import { site } from "@/lib/site.config";
import { loadOgFonts } from "@/lib/og";

export const runtime = "nodejs";
export const alt = `${site.title} — ${site.description}`;
export const size = { width: site.og.width, height: site.og.height };
export const contentType = "image/png";

/** 站点级 Open Graph 分享卡：印章 + 站名 + 描述，自动生成。 */
export default async function OpengraphImage() {
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
              width: 104,
              height: 104,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: site.colors.brand,
              borderRadius: 22,
              color: site.colors.background,
              fontSize: 58,
              fontWeight: 900,
            }}
          >
            {site.sealChar}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 46, fontWeight: 900, color: site.colors.heading, letterSpacing: 3 }}>
              {site.title}
            </div>
            <div style={{ fontSize: 20, color: site.colors.muted, letterSpacing: 8, marginTop: 10 }}>
              {site.alternateName.toUpperCase()}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 8, height: 44, backgroundColor: site.colors.brand, borderRadius: 4 }} />
          <div style={{ fontSize: 34, color: site.colors.heading, lineHeight: 1.4 }}>{site.description}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 22, color: site.colors.muted, letterSpacing: 2 }}>{site.tagline}</div>
          <div style={{ fontSize: 24, color: site.colors.brand, letterSpacing: 1 }}>{site.domain}</div>
        </div>
      </div>
    ),
    { ...size, fonts: await loadOgFonts() }
  );
}
