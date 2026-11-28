"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search as SearchIcon, X } from "lucide-react";
import { formatDate, toISO } from "@/lib/format";
import { MencaImage } from "./MencaImage";

interface Hit {
  title: string;
  url: string;
  date: string;
  description?: string;
  image?: string;
  tags?: string[];
  category?: string;
  content?: string;
}

export function Search() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<Hit[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => inputRef.current?.focus(), 250);
    fetch("/search.json")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setIndex(Array.isArray(data) ? data : []))
      .catch(() => setIndex([]));
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const term = query.trim().toLowerCase();
  const hits = term
    ? index
        .filter((hit) => {
          const haystack = [hit.title, hit.description ?? "", hit.category ?? "", hit.content ?? "", ...(hit.tags ?? [])]
            .join(" ")
            .toLowerCase();
          return term.split(/\s+/).every((word) => haystack.includes(word));
        })
        .slice(0, 10)
    : [];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="搜索"
        className="nav__icon icon__search"
        aria-expanded={open}
      >
        <SearchIcon aria-hidden="true" />
      </button>
      <div className={`search${open ? " is-visible" : ""}`} aria-hidden={!open}>
        <div className="container">
          <div className="row">
            <div className="col col-12">
              <div className="search__box">
                <div className="search__group">
                  <button
                    type="button"
                    className="search__close"
                    onClick={() => setOpen(false)}
                    aria-label="关闭搜索"
                    tabIndex={open ? 0 : -1}
                  >
                    <X aria-hidden="true" />
                  </button>
                  <label htmlFor="js-search-input" className="screen-reader-text">
                    搜索文章
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    id="js-search-input"
                    title="搜索文章"
                    className="search__text"
                    autoComplete="off"
                    placeholder="输入关键词搜索…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    tabIndex={open ? 0 : -1}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="container">
          <div className="row search-results-list" id="js-results-container" aria-live="polite">
            {term && hits.length === 0 ? <h3 className="no-results">没有找到相关内容</h3> : null}
            {hits.map((hit) => (
              <article className="article col col-4 col-d-6 col-t-12" key={hit.url}>
                <div className="article__inner">
                  <div className="article__head">
                    <time className="article__date" dateTime={toISO(hit.date)}>
                      {formatDate(hit.date)}
                    </time>
                    {hit.image ? (
                      <Link className="article__image" href={hit.url} onClick={() => setOpen(false)}>
                        <MencaImage src={hit.image} alt={hit.title} />
                      </Link>
                    ) : null}
                  </div>
                  <div className="article__content">
                    <h2 className="article__title">
                      <Link href={hit.url} onClick={() => setOpen(false)}>{hit.title}</Link>
                    </h2>
                    {hit.description ? <p className="article__excerpt">{hit.description}</p> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
