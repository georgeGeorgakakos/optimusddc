// ==============================================================================
// FILE: amundsen_application/static/js/pages/LogAnalyticsPage/components/LogPagination.tsx
// ==============================================================================

import * as React from 'react';

interface LogPaginationProps {
  currentPage: number;
  totalPages: number;
  totalLogs: number;
  logsPerPage: number;
  onPageChange: (page: number) => void;
  onLogsPerPageChange: (logsPerPage: number) => void;
}

const LogPagination: React.FC<LogPaginationProps> = ({
  currentPage,
  totalPages,
  totalLogs,
  logsPerPage,
  onPageChange,
  onLogsPerPageChange,
}) => {
  const startLog = (currentPage - 1) * logsPerPage + 1;
  const endLog = Math.min(currentPage * logsPerPage, totalLogs);

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 7;

    if (totalPages <= maxPagesToShow) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="log-pagination">
      <div className="pagination-info">
        <span className="showing-text">
          Showing <strong>{startLog}</strong> to <strong>{endLog}</strong> of{' '}
          <strong>{totalLogs.toLocaleString()}</strong> logs
        </span>
      </div>

      <div className="pagination-controls">
        <div className="per-page-selector">
          <label htmlFor="logs-per-page">Logs per page:</label>
          <select
            id="logs-per-page"
            value={logsPerPage}
            onChange={(e) => onLogsPerPageChange(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="page-navigation">
          <button
            className="page-btn page-btn-prev"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            title="Previous page"
          >
            ❮ Previous
          </button>

          <div className="page-numbers">
            {pageNumbers.map((page, index) => {
              if (page === '...') {
                return (
                  <span key={`ellipsis-${index}`} className="page-ellipsis">
                    ...
                  </span>
                );
              }

              return (
                <button
                  key={page}
                  className={`page-btn page-number ${
                    page === currentPage ? 'active' : ''
                  }`}
                  onClick={() => onPageChange(page as number)}
                  disabled={page === currentPage}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            className="page-btn page-btn-next"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            title="Next page"
          >
            Next ❯
          </button>
        </div>
      </div>

      <div className="pagination-jump">
        <label htmlFor="jump-to-page">Go to page:</label>
        <input
          id="jump-to-page"
          type="number"
          min={1}
          max={totalPages}
          placeholder={currentPage.toString()}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              const value = parseInt((e.target as HTMLInputElement).value, 10);

              if (value >= 1 && value <= totalPages) {
                onPageChange(value);
                (e.target as HTMLInputElement).value = '';
              }
            }
          }}
        />
      </div>
    </div>
  );
};

export default LogPagination;
