import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import type { ComponentPropsWithoutRef } from "react";
import { MencaImage } from "./MencaImage";

function normalizeImgSrc(src: unknown): string {
  const value = String(src ?? "");
  if (/^(https?:|data:|\/)/i.test(value)) return value;
  const cleaned = value.replace(/^\.?\//, "").replace(/^images\//, "");
  return `/images/${cleaned}`;
}

export function Markdown({
  children,
  className = "post__content",
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          img: ({ src, alt, ...props }: ComponentPropsWithoutRef<"img">) => (
            <MencaImage src={normalizeImgSrc(src)} alt={alt ?? ""} {...props} />
          ),
          a: ({ href, children, ...props }: ComponentPropsWithoutRef<"a">) => {
            const external = /^https?:\/\//i.test(String(href ?? ""));
            return (
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                {...props}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
