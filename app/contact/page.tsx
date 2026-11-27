import type { Metadata } from "next";
import { site } from "@/lib/site.config";
import { MencaImage } from "@/components/MencaImage";

export const metadata: Metadata = {
  title: "Contact",
  description: site.contact.description,
  alternates: { canonical: `${site.url}/contact` },
};

export default function ContactPage() {
  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="row">
            <div className="col col-12">
              <div className="page-image">
                <MencaImage src="/images/houstonvintage.png" alt="Contact" eager />
              </div>
            </div>
            <div className="col col-12">
              <div className="page__info">
                <h1 className="page__title">Contact</h1>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="container animate">
        <article className="page">
          <div className="page__content">
            <div className="form-box">
              <div className="contact-head">
                <p className="page-description">{site.contact.description}</p>
              </div>
              <form className="form" action={site.contact.formAction} method="POST">
                <div className="form__group">
                  <label className="form__label screen-reader-text" htmlFor="form-name">Your Name</label>
                  <input className="form__input" id="form-name" type="text" name="name" placeholder="Name" required />
                </div>
                <div className="form__group">
                  <label className="form__label screen-reader-text" htmlFor="form-email">Your Email</label>
                  <input className="form__input" id="form-email" type="email" name="_replyto" placeholder="Email" required />
                </div>
                <div className="form__group">
                  <label className="form__label screen-reader-text" htmlFor="form-text">Your Message</label>
                  <textarea className="form__input" id="form-text" name="text" rows={10} placeholder="Message" required />
                </div>
                <div className="form__group">
                  <button className="button button--primary" type="submit">Send Message</button>
                </div>
              </form>
            </div>
          </div>
        </article>
      </div>
    </>
  );
}
