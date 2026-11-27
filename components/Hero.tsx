import { site } from "@/lib/site.config";
import { MencaImage } from "./MencaImage";

export function Hero() {
  return (
    <section className="hero">
      <div className="container">
        <div className="row">
          <div className="col col-12">
            <div className="hero__inner">
              <div className="hero__left">
                <h1 className="hero__title">{site.hero.title}</h1>
                <p className="hero__description">{site.hero.description}</p>
              </div>
              <div className="hero__right">
                <div className="hero__image">
                  <MencaImage
                    src={site.hero.image}
                    alt={`${site.author.name}'s Picture`}
                    eager
                    fetchPriority="high"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
