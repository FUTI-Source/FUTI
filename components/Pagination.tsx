import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  currentPage,
  totalPages,
  basePath = "/page",
}: {
  currentPage: number;
  totalPages: number;
  basePath?: string;
}) {
  if (totalPages <= 1) return null;
  const href = (page: number) => (page === 1 ? "/" : `${basePath}/${page}`);

  return (
    <div className="container">
      <div className="row">
        <div className="col col-12">
          <nav className="pagination animate" aria-label="Pagination">
            <div className="pagination__inner">
              <div className="pagination__list">
                {currentPage > 1 ? (
                  <Link href={href(currentPage - 1)} className="pagination__prev pagination__item">
                    <i aria-hidden="true"><ChevronLeft /></i> Prev
                  </Link>
                ) : (
                  <span className="pagination__prev pagination__item disabled">
                    <i aria-hidden="true"><ChevronLeft /></i> Prev
                  </span>
                )}
                <div className="pagination__count pagination__item">
                  Page {currentPage} of {totalPages}
                </div>
                {currentPage < totalPages ? (
                  <Link href={href(currentPage + 1)} className="pagination__next pagination__item">
                    Next <i aria-hidden="true"><ChevronRight /></i>
                  </Link>
                ) : (
                  <span className="pagination__next pagination__item disabled">
                    Next <i aria-hidden="true"><ChevronRight /></i>
                  </span>
                )}
              </div>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
