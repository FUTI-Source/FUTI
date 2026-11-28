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
          <nav className="pagination animate" aria-label="分页">
            <div className="pagination__inner">
              <div className="pagination__list">
                {currentPage > 1 ? (
                  <Link href={href(currentPage - 1)} className="pagination__prev pagination__item">
                    <i aria-hidden="true"><ChevronLeft /></i> 上一页
                  </Link>
                ) : (
                  <span className="pagination__prev pagination__item disabled">
                    <i aria-hidden="true"><ChevronLeft /></i> 上一页
                  </span>
                )}
                <div className="pagination__count pagination__item">
                  第 {currentPage} / {totalPages} 页
                </div>
                {currentPage < totalPages ? (
                  <Link href={href(currentPage + 1)} className="pagination__next pagination__item">
                    下一页 <i aria-hidden="true"><ChevronRight /></i>
                  </Link>
                ) : (
                  <span className="pagination__next pagination__item disabled">
                    下一页 <i aria-hidden="true"><ChevronRight /></i>
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
