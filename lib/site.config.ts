import type { ComponentType, SVGProps } from "react";
import { Mail, BookOpen } from "lucide-react";
import { XIcon, LinkedinIcon, PinterestIcon } from "@/components/ui/icons";

export interface SocialLink {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  href: string;
}

export interface GalleryImage {
  alt: string;
  url: string;
}

export const site = {
  title: "张文涛",
  description: "Personal website and blog.",
  // 迁移到根路径，不再使用 /mencaold 子路径
  url: "http://192.168.0.31:3000",
  author: {
    name: "张文涛",
    bio: "Mom. Grant Writer. Author.",
    avatar: "/images/headshotvintage.png",
    email: "meredithcook@proton.me",
  },
  perPage: 9,
  nav: [
    { label: "Home", href: "/" },
    { label: "Tags", href: "/tags" },
  ],
  social: [
    { label: "Email", icon: Mail, href: "mailto:meredithcook@proton.me" },
    { label: "X", icon: XIcon, href: "https://twitter.com/meredithcook716" },
    { label: "LinkedIn", icon: LinkedinIcon, href: "https://www.linkedin.com/in/meredithcook716/" },
    { label: "Pinterest", icon: PinterestIcon, href: "https://www.pinterest.com/meredithlcook/" },
    { label: "Book", icon: BookOpen, href: "https://amzn.to/45wlDh1" },
  ] satisfies SocialLink[],
  gallery: [
    { alt: "Torrey Pines", url: "/images/torreypinesvintage.jpeg" },
    { alt: "Big Bend National Park", url: "/images/bigbendvintage.jpeg" },
    { alt: "West Virginia", url: "/images/westvirginiavintage.jpeg" },
    { alt: "Tokyo", url: "/images/tokyovintage.jpeg" },
    { alt: "Grand Canyon", url: "/images/grandcanyonvintage.jpeg" },
    { alt: "Paris", url: "/images/notredamevintage.jpeg" },
    { alt: "Japan", url: "/images/japanmountainvintage.jpeg" },
    { alt: "India", url: "/images/indiavintage.jpeg" },
    { alt: "Istanbul", url: "/images/istanbulvintage.jpeg" },
  ] satisfies GalleryImage[],
  contact: {
    email: "meredithcook@proton.me",
    description:
      "To contact me with questions or comments, please fill out the form below.",
    // 沿用原站 Formspree 端点
    formAction: "https://formspree.io/f/mdorzaaz",
  },
  // 原站留空，保持可配置但默认不启用
  googleAnalytics: "",
  mailchimp: "",
} as const;
