"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
// @ts-expect-error lightense-images 未提供 TypeScript 类型声明
import Lightense from "lightense-images";

/** 使用 Menca 原版 Lightense：图片平滑缩放、背景模糊、滚动/ESC 关闭。 */
export function Lightbox() {
  const pathname = usePathname();

  useEffect(() => {
    const linkedImages = document.querySelectorAll<HTMLImageElement>(
      ".page__content a img, .post__content a img, .gallery__image a img"
    );
    linkedImages.forEach((image) => {
      image.parentElement?.classList.add("image-link");
      image.classList.add("no-lightense");
    });

    Lightense(
      ".page__content img:not(.no-lightense), .post__content img:not(.no-lightense), .gallery__image img:not(.no-lightense)",
      { padding: 60, offset: 30 }
    );
  }, [pathname]);

  return null;
}
