"use client";

import type { MouseEvent } from "react";
import { site } from "@/lib/site.config";
import { XIcon, FacebookIcon, LinkedinIcon, PinterestIcon } from "@/components/icons";

export function ShareButtons({
  slug,
  title,
  description = "",
  image = "",
}: {
  slug: string;
  title: string;
  description?: string;
  image?: string;
}) {
  const url = `${site.url}/${slug}`;
  const links = [
    {
      label: "Share on Twitter",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
      Icon: XIcon,
      className: "share__twitter",
    },
    {
      label: "Share on Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      Icon: FacebookIcon,
      className: "share__facebook",
    },
    {
      label: "Share on Pinterest",
      href: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&media=${encodeURIComponent(`${site.url}${image}`)}&description=${encodeURIComponent(title)}`,
      Icon: PinterestIcon,
      className: "share__pinterest",
    },
    {
      label: "Share on LinkedIn",
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(description)}&source=${encodeURIComponent(site.title)}`,
      Icon: LinkedinIcon,
      className: "share__linkedin",
    },
  ];

  const openPopup = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.open(event.currentTarget.href, "pop-up", "left=20,top=20,width=600,height=500,toolbar=1,resizable=0");
  };

  return (
    <div className="post__share">
      <ul className="share__list list-reset">
        {links.map(({ label, href, Icon, className }) => (
          <li className="share__item" key={label}>
            <a
              className={`share__link ${className}`}
              href={href}
              onClick={openPopup}
              title={label}
              aria-label={label}
              rel="nofollow noopener noreferrer"
            >
              <i aria-hidden="true"><Icon /></i>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
