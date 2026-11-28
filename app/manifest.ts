import type { MetadataRoute } from "next";
import { site } from "@/lib/site.config";

/** PWA / 添加到主屏清单。 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.title,
    short_name: site.title,
    description: site.description,
    lang: "zh-CN",
    start_url: "/",
    display: "standalone",
    background_color: site.colors.background,
    theme_color: site.colors.brand,
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
