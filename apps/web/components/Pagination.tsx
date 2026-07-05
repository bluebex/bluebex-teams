type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (total === 0) return null;

  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div className="bb-pagination">
      <span className="bb-pagination-summary">
        Showing {rangeStart}–{rangeEnd} of {total}
      </span>
      <div className="bb-pagination-controls">
        <button
          type="button"
          className="bb-admin-btn bb-admin-btn-outline bb-pagination-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="bb-pagination-page">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="bb-admin-btn bb-admin-btn-outline bb-pagination-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
