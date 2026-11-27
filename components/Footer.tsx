import Link from "next/link";
import { site } from "@/lib/site.config";
import { BackToTop } from "./BackToTop";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__info">
        <div className="container">
          <div className="row">
            <div className="col col-12">
              <div className="footer__info-box">
                <div className="copyright">
                  {new Date().getFullYear()} &copy; <Link href="/">{site.title}</Link>.
                  <br />
                  <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">
                    晋ICP备2026019630号
                  </a>
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
