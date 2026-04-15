import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import api from '../api/axios';
import * as Icons from '../components/Icons';

const statusOptions = ['', 'draft', 'submitted', 'under_review', 'kyc_verified', 'credit_checked', 'approved', 'rejected', 'disbursal_ready', 'disbursed'];

export default function Applications() {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [savedViews, setSavedViews] = useState([]);
    const [selectedViewId, setSelectedViewId] = useState('');
    const [viewName, setViewName] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const navigate = useNavigate();

    const loadApps = useCallback(async (overrides = {}) => {
        setLoading(true);
        try {
            const effectivePage = overrides.page ?? page;
            const effectiveStatus = overrides.status ?? statusFilter;
            const effectiveSearch = overrides.search ?? search;

            const params = { page: effectivePage };
            if (effectiveStatus) params.status = effectiveStatus;
            if (effectiveSearch) params.search = effectiveSearch;
            const res = await api.get('/loans/', { params });
            setApps(res.data.results || []);
            setTotalPages(Math.ceil((res.data.count || 0) / 20));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, search]);

    useEffect(() => { loadApps(); }, [loadApps]);
    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem('loan_app_saved_views') || '[]');
            setSavedViews(Array.isArray(stored) ? stored : []);
        } catch {
            setSavedViews([]);
        }
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        loadApps({ page: 1, search });
    };

    const saveCurrentView = () => {
        const trimmed = viewName.trim();
        if (!trimmed) return;
        const newView = {
            id: `view-${Date.now()}`,
            name: trimmed,
            search,
            status: statusFilter,
        };
        const updated = [newView, ...savedViews].slice(0, 10);
        setSavedViews(updated);
        setSelectedViewId(newView.id);
        setViewName('');
        localStorage.setItem('loan_app_saved_views', JSON.stringify(updated));
    };

    const applySavedView = (id) => {
        setSelectedViewId(id);
        const selected = savedViews.find((v) => v.id === id);
        if (!selected) return;
        setSearch(selected.search || '');
        setStatusFilter(selected.status || '');
        setPage(1);
        loadApps({ page: 1, search: selected.search || '', status: selected.status || '' });
    };

    const deleteSavedView = () => {
        if (!selectedViewId) return;
        const updated = savedViews.filter((v) => v.id !== selectedViewId);
        setSavedViews(updated);
        setSelectedViewId('');
        localStorage.setItem('loan_app_saved_views', JSON.stringify(updated));
    };

    const formatCurrency = (val) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

    return (
        <>
            <Topbar title="Applications" />
            <div className="page-content">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">All Loan Applications</h3>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <form onSubmit={handleSearch} className="search-bar">
                                <Icons.Search />
                                <input
                                    placeholder="Search by ID, name, phone..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </form>
                            <select
                                className="form-select"
                                style={{ width: '180px' }}
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            >
                                <option value="">All Statuses</option>
                                {statusOptions.filter(Boolean).map((s) => (
                                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                                ))}
                            </select>
                            <select
                                className="form-select"
                                style={{ width: '170px' }}
                                value={selectedViewId}
                                onChange={(e) => applySavedView(e.target.value)}
                            >
                                <option value="">Saved Views</option>
                                {savedViews.map((v) => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                            <input
                                className="form-input"
                                style={{ width: '150px', marginBottom: 0 }}
                                placeholder="View name"
                                value={viewName}
                                onChange={(e) => setViewName(e.target.value)}
                            />
                            <button className="btn btn-outline btn-sm" onClick={saveCurrentView} disabled={!viewName.trim()}>
                                Save View
                            </button>
                            <button className="btn btn-outline btn-sm" onClick={deleteSavedView} disabled={!selectedViewId}>
                                Delete View
                            </button>
                            <button className="btn btn-primary btn-sm" onClick={() => navigate('/applications/new')}>
                                + New Application
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="loading-spinner"><div className="spinner"></div></div>
                    ) : (
                        <>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Applicant ID</th>
                                            <th>Customer</th>
                                            <th>Phone</th>
                                            <th>City</th>
                                            <th>Amount</th>
                                            <th>Tenure</th>
                                            <th>Status</th>
                                            <th>Agent</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {apps.length === 0 ? (
                                            <tr><td colSpan="9">
                                                <div className="empty-state">
                                                    <div className="empty-state-icon"><Icons.ClipboardList /></div>
                                                    <p>No applications found</p>
                                                </div>
                                            </td></tr>
                                        ) : apps.map((app) => (
                                            <tr key={app.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/applications/${app.id}`)}>
                                                <td style={{ fontWeight: 600, color: 'var(--primary-400)' }}>{app.applicant_id}</td>
                                                <td style={{ fontWeight: 500 }}>{app.customer_full_name}</td>
                                                <td>{app.customer_phone}</td>
                                                <td>{app.city || '—'}</td>
                                                <td style={{ fontWeight: 600 }}>{formatCurrency(app.loan_amount)}</td>
                                                <td>{app.loan_tenure_months} mo</td>
                                                <td><span className={`badge badge-${app.status}`}>{app.status.replace(/_/g, ' ')}</span></td>
                                                <td style={{ color: 'var(--text-muted)' }}>{app.agent_name || '—'}</td>
                                                <td style={{ color: 'var(--text-muted)' }}>{new Date(app.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px' }}>
                                    <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                        <Icons.ArrowLeft /> Prev
                                    </button>
                                    <span style={{ padding: '6px 14px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        Page {page} of {totalPages}
                                    </span>
                                    <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                        Next <Icons.ChevronRight />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
