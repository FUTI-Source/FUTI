import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/content";
import { site } from "@/lib/site.config";
import { Markdown } from "@/components/Markdown";
import { MencaImage } from "@/components/MencaImage";

export function generateMetadata(): Metadata {
  const page = getPage("elements");
  return {
    title: page?.title ?? "Elements",
    description: page?.description ?? site.description,
    alternates: { canonical: `${site.url}/elements` },
  };
}

export default function ElementsPage() {
  const page = getPage("elements");
  if (!page) notFound();

  return (
    <>
      <div className="page-head">
        <div className="container">
          <div className="row">
            {page.image ? (
              <div className="col col-12">
                <div className="page-image">
                  <MencaImage src={page.image} alt={page.title} eager />
                </div>
              </div>
            ) : null}
            <div className="col col-12">
              <div className="page__info">
                <h1 className="page__title">{page.title}</h1>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="container animate">
        <article className="page">
          <Markdown className="page__content">{page.content}</Markdown>
        </article>
      </div>
    </>
  );
}
