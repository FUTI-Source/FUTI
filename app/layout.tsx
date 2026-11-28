import type { Metadata } from "next";
import { Jost } from "next/font/google";
import "./uno.css";
import { site } from "@/lib/site.config";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Lightbox } from "@/components/ui/Lightbox";
import { ThemeScript } from "@/components/layout/ThemeScript";

const jost = Jost({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
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
    url: site.url,
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={jost.variable}>
      <body>
        <ThemeScript />
        <Header />
        <main className="content" aria-label="Content">
          {children}
        </main>
        <Footer />
        <Lightbox />
      </body>
    </html>
  );
}
