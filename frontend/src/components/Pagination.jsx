import * as Icons from './Icons';

export default function Pagination({ page, totalPages, onPageChange, pageSize, onPageSizeChange, totalCount }) {
    if (totalPages <= 1 && !totalCount) return null;

    const pages = [];
    const delta = 2;
    for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) pages.push(i);

    const showFirst = pages[0] > 1;
    const showLast  = pages[pages.length - 1] < totalPages;

    return (
        <div className="pagination-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                {totalCount != null && <span>Total: <strong style={{ color: 'var(--text-secondary)' }}>{totalCount}</strong></span>}
                {onPageSizeChange && (
                    <select
                        value={pageSize}
                        onChange={e => onPageSizeChange(Number(e.target.value))}
                        className="form-select"
                        style={{ width: 'auto', padding: '3px 28px 3px 8px', fontSize: '0.78rem', height: 30 }}
                    >
                        {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
                    </select>
                )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button className="btn btn-outline btn-sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1} style={{ padding: '4px 8px' }}>
                    <Icons.ArrowLeft />
                </button>
                {showFirst && <>
                    <button className="page-btn" onClick={() => onPageChange(1)}>1</button>
                    {pages[0] > 2 && <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>...</span>}
                </>}
                {pages.map(p => (
                    <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => onPageChange(p)}>{p}</button>
                ))}
                {showLast && <>
                    {pages[pages.length - 1] < totalPages - 1 && <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>...</span>}
                    <button className="page-btn" onClick={() => onPageChange(totalPages)}>{totalPages}</button>
                </>}
                <button className="btn btn-outline btn-sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} style={{ padding: '4px 8px', transform: 'rotate(180deg)' }}>
                    <Icons.ArrowLeft />
                </button>
            </div>
        </div>
    );
}
