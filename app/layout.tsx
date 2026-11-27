import type { Metadata } from "next";
import Script from "next/script";
import { Jost } from "next/font/google";
import "./globals.css";
import "./menca.css";
import { site } from "@/lib/site.config";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Lightbox } from "@/components/ui/Lightbox";

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

// 与 Menca 原版一致：仅记住用户主动选择的深色模式，并在首屏前应用。
const themeInitScript = `if(localStorage.getItem("theme")==="dark"){document.documentElement.setAttribute("dark","");document.documentElement.classList.add("dark-mode");}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={jost.variable}>
      <body>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
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
