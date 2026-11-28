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
import { WeChatShare } from "@/components/layout/WeChatShare";
import { QQMetas } from "@/components/layout/QQMetas";

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
  applicationName: site.title,
  alternates: site.url ? { canonical: site.url } : undefined,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
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

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: site.title,
  alternateName: "Zhang Wentao",
  ...(site.url ? { url: site.url } : {}),
  description: site.description,
  inLanguage: "zh-CN",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning data-scroll-behavior="smooth" className={jost.variable}>
      <body>
        {site.url ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        ) : null}
        <ThemeScript />
        <QQMetas />
        <HashScrollFix />
        <AnchorBounce />
        <WeChatShare />
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
