import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import * as Icons from './Icons';

export default function GlobalSearch({ onClose }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        if (!query.trim()) { setResults([]); return; }
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await api.get('/loans/', { params: { search: query, page_size: 8 } });
                setResults(res.data.results || []);
            } catch { setResults([]); }
            finally { setLoading(false); }
        }, 280);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [results]);

    const handleKey = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)); }
        if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
        if (e.key === 'Enter' && results[selectedIndex]) { goto(results[selectedIndex].id); }
        if (e.key === 'Escape') onClose();
    };

    const goto = (id) => { navigate(`/applications/${id}`); onClose(); };

    const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

    return (
        <div className="global-search-overlay" onClick={onClose}>
            <div className="global-search-modal" onClick={e => e.stopPropagation()}>
                <div className="global-search-input-row">
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}><Icons.Search /></span>
                    <input
                        ref={inputRef}
                        className="global-search-input"
                        placeholder="Search by name, phone, PAN, Applicant ID..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKey}
                    />
                    {loading && <div className="spinner" style={{ width: 16, height: 16, borderWidth: 1.5, flexShrink: 0 }} />}
                    <kbd className="search-kbd" onClick={onClose}>Esc</kbd>
                </div>
                {results.length > 0 && (
                    <div className="global-search-results">
                        {results.map((app, i) => (
                            <div
                                key={app.id}
                                className={`search-result-item ${i === selectedIndex ? 'selected' : ''}`}
                                onClick={() => goto(app.id)}
                                onMouseEnter={() => setSelectedIndex(i)}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                        <span style={{ fontWeight: 700, color: 'var(--primary-400)', fontSize: '0.8rem' }}>{app.applicant_id}</span>
                                        <span className={`badge badge-${app.status}`} style={{ fontSize: '0.65rem' }}>{app.status?.replace(/_/g, ' ')}</span>
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.customer_full_name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>{app.customer_phone} · {fmt(app.loan_amount)}</div>
                                </div>
                                <Icons.ChevronRight />
                            </div>
                        ))}
                    </div>
                )}
                {query && !loading && results.length === 0 && (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                        No applications found for "<strong>{query}</strong>"
                    </div>
                )}
                {!query && (
                    <div style={{ padding: '18px 16px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        <div style={{ marginBottom: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>Quick tips</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.Search /> Search by applicant ID, customer name, phone, or PAN</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.ArrowUp /><Icons.ArrowDown /> Navigate with arrow keys, Enter to open</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
