import Link from "next/link";
import { site } from "@/lib/site.config";
import { BackToTop } from "./BackToTop";
import { MencaImage } from "./MencaImage";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="container">
          <div className="row">
            <div className="col col-5 col-d-12">
              <div className="footer__author">
                <div className="footer__author-avatar">
                  <MencaImage src={site.author.avatar} alt={site.author.name} />
                </div>
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
            <div className="col col-6 push-1 col-d-12 push-d-0">
              <div className="footer__gallery">
                <h3 className="footer__gallery-title">My Photos</h3>
                <div className="gallery-footer">
                  <div className="gallery">
                    {site.gallery.map((image) => (
                      <div className="gallery__image" key={image.url}>
                        <MencaImage src={image.url} alt={image.alt} />
                      </div>
                    ))}
                  </div>
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
