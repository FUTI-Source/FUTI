"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { site } from "@/lib/site.config";
import { ThemeToggle } from "./ThemeToggle";
import { Search } from "./Search";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header className="header" id="top">
      <div className="container">
        <div className="row">
          <div className="header__inner col col-12">
            <div className="logo">
              <Link className="logo__link" href="/">
                {site.title}
              </Link>
            </div>

            <nav className={`main-nav${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
              <div className="main-nav__box">
                <button
                  className="nav__icon-close"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  tabIndex={menuOpen ? 0 : -1}
                >
                  <X aria-hidden="true" />
                </button>
                <div className="nav__title">Menu</div>
                <ul className="nav__list list-reset">
                  {site.nav.map((item) => (
                    <li className="nav__item" key={item.href}>
                      <Link href={item.href} className="nav__link">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                  <li className="nav__item nav__item-icon">
                    <ThemeToggle />
                  </li>
                </ul>
              </div>
            </nav>

            <div className="nav-button">
              <button
                className="nav__icon icon__menu"
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                aria-expanded={menuOpen}
              >
                <Menu aria-hidden="true" />
              </button>
              <Search />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
