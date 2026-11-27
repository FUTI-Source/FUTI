"use client";

import { useEffect, useRef } from "react";
import { site } from "@/lib/site.config";

export function Disqus({ slug, title }: { slug: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!site.disqus.shortname) return;
    const shortname = site.disqus.shortname;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    w.disqus_config = function () {
      this.page.url = `${site.url}/${slug}`;
      this.page.identifier = slug;
      this.page.title = title;
    };
    if (w.DISQUS) {
      w.DISQUS.reset({ reload: true, config: w.disqus_config });
      return;
    }
    const script = document.createElement("script");
    script.src = `https://${shortname}.disqus.com/embed.js`;
    script.setAttribute("data-timestamp", String(Date.now()));
    script.async = true;
    script.id = "dsq-embed-scr";
    (ref.current ?? document.body).appendChild(script);
  }, [slug, title]);

  if (!site.disqus.shortname) return null;

  return (
    <div className="container">
      <div className="row">
        <div className="col col-12">
          <div className="post__comments is-open">
            <div id="disqus_thread" ref={ref} />
          </div>
        </div>
      </div>
    </div>
  );
}
