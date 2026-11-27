"use client";

import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

type MencaImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "onLoad" | "loading"> & {
  eager?: boolean;
};

/** 保留 Menca 的懒加载淡入效果，同时使用浏览器原生懒加载。 */
export function MencaImage({ eager = false, className = "", ...props }: MencaImageProps) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (ref.current?.complete) setLoaded(true);
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      ref={ref}
      loading={eager ? "eager" : "lazy"}
      className={`lazy${loaded ? " loaded" : ""}${className ? ` ${className}` : ""}`}
      onLoad={() => setLoaded(true)}
    />
  );
}
