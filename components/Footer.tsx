import Link from "next/link";
import { site } from "@/lib/site.config";
import { BackToTop } from "./BackToTop";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="container">
          <div className="row">
            <div className="col col-12">
              <div className="footer__author">
                <h3 className="footer__author-name">{site.author.name}</h3>
                <p className="footer__author-bio">{site.author.bio}</p>
                <div className="social">
                  <ul className="social__list list-reset">
                    {site.social.map((social) => {
                      const Icon = social.icon;
                      return (
                        <li className="social__item" key={social.label}>
                          <a
                            className="social__link"
                            href={social.href}
                            target={social.href.startsWith("http") ? "_blank" : undefined}
                            rel="noopener noreferrer"
                            aria-label={`${social.label} link`}
                          >
                            <Icon aria-hidden="true" />
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="footer__info">
        <div className="container">
          <div className="row">
            <div className="col col-12">
              <div className="footer__info-box">
                <div className="copyright">
                  {new Date().getFullYear()} &copy; <Link href="/">{site.title}</Link>. Crafted &amp; Designed by{" "}
                  <a href="https://jekyllthemes.io/developers/artem-sheludko" target="_blank" rel="noopener noreferrer">
                    Artem Sheludko
                  </a>.
                </div>
                <BackToTop />
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
