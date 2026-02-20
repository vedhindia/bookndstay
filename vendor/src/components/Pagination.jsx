import React from 'react';

const range = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => start + i);

const Pagination = ({ current = 1, total = 0, pageSize = 10, onChange }) => {
  const totalPages = Math.max(1, Math.ceil(Number(total || 0) / Number(pageSize || 10)));
  const page = Math.min(Math.max(1, Number(current || 1)), totalPages);

  const emit = (p) => {
    if (p < 1 || p > totalPages) return;
    onChange && onChange(p);
  };

  // Simple window of pages
  const window = 2; // pages around current
  const start = Math.max(1, page - window);
  const end = Math.min(totalPages, page + window);
  const pages = range(start, end);

  return (
    <nav aria-label="Pagination">
      <ul className="pagination justify-content-end m-0">
        <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => emit(page - 1)} aria-label="Previous">
            <span aria-hidden="true">&laquo;</span>
          </button>
        </li>
        {start > 1 && (
          <>
            <li className="page-item">
              <button className="page-link" onClick={() => emit(1)}>1</button>
            </li>
            {start > 2 && <li className="page-item disabled"><span className="page-link">…</span></li>}
          </>
        )}
        {pages.map((p) => (
          <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
            <button className="page-link" onClick={() => emit(p)}>{p}</button>
          </li>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <li className="page-item disabled"><span className="page-link">…</span></li>}
            <li className="page-item">
              <button className="page-link" onClick={() => emit(totalPages)}>{totalPages}</button>
            </li>
          </>
        )}
        <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => emit(page + 1)} aria-label="Next">
            <span aria-hidden="true">&raquo;</span>
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Pagination;
