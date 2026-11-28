import type { Metadata } from "next";
import { Jost } from "next/font/google";
import "./fonts.css";
import "./uno.css";
import { site } from "@/lib/site.config";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Lightbox } from "@/components/ui/Lightbox";
import { ThemeScript } from "@/components/layout/ThemeScript";
import { HashScrollFix } from "@/components/layout/HashScrollFix";
import { AnchorBounce } from "@/components/layout/AnchorBounce";

const jost = Jost({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: site.url ? new URL(site.url) : undefined,
  title: {
    default: site.title,
    template: `%s | ${site.title}`,
  },
  description: site.description,
  openGraph: {
    type: "website",
    siteName: site.title,
    title: site.title,
    description: site.description,
    ...(site.url ? { url: site.url } : {}),
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning data-scroll-behavior="smooth" className={jost.variable}>
      <body>
        <ThemeScript />
        <HashScrollFix />
        <AnchorBounce />
        <Header />
        <main className="content" aria-label="正文">
          {children}
        </main>
        <Footer />
        <Lightbox />
      </body>
    </html>
  );
}
