import { useState, useEffect, useCallback } from 'react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { SkeletonTable } from '../components/Skeleton';
import api from '../api/axios';
import * as Icons from '../components/Icons';

const ACTION_ICONS = {
    approve: <Icons.CheckCircle />,
    reject:  <Icons.XCircle />,
    verify:  <Icons.Shield />,
    login:   <Icons.Lock />,
    upload:  <Icons.Download />,
    create:  <Icons.Plus />,
    update:  <Icons.RefreshCw />,
};
const ACTION_COLORS = {
    approve: 'var(--success-500)',
    reject:  'var(--danger-500)',
    verify:  'var(--primary-400)',
    login:   'var(--info-500)',
    upload:  'var(--warning-500)',
    create:  'var(--primary-400)',
    update:  'var(--text-muted)',
};

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [viewMode, setViewMode] = useState('timeline'); // 'timeline' | 'table'

    const actions = ['', 'create', 'update', 'approve', 'reject', 'verify', 'login', 'upload'];

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (actionFilter) params.action = actionFilter;
            if (fromDate) params.from_date = fromDate;
            if (toDate) params.to_date = toDate;
            const res = await api.get('/audit/logs/', { params });
            setLogs(res.data.results || res.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [actionFilter, fromDate, toDate]);

    useEffect(() => { loadLogs(); }, [loadLogs]);

    const exportCSV = () => {
        const header = ['Timestamp', 'User', 'Action', 'Resource', 'Description', 'IP Address'];
        const rows = logs.map(log => [
            new Date(log.timestamp).toLocaleString(),
            log.user_name || '',
            log.action || '',
            log.model_name || '',
            (log.description || '').replace(/,/g, ';'),
            log.ip_address || '',
        ]);
        const csv = [header, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    const timeAgo = (ts) => {
        const diff = (Date.now() - new Date(ts)) / 1000;
        if (diff < 60) return `${Math.round(diff)}s ago`;
        if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
        return new Date(ts).toLocaleDateString();
    };

    const getBadgeClass = (action) => {
        const map = { approve: 'approved', reject: 'rejected', verify: 'kyc_verified', login: 'submitted', upload: 'under_review', create: 'submitted', update: 'under_review' };
        return `badge badge-${map[action] || 'submitted'}`;
    };

    return (
        <>
            <Topbar title="Audit Logs" />
            <div className="page-content">
                <Breadcrumb />
                <div className="card">
                    <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
                        <h3 className="card-title">System Audit Trail</h3>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            {/* Date range */}
                            <input type="date" className="form-input" value={fromDate} onChange={e => setFromDate(e.target.value)}
                                style={{ width: 'auto', height: 32, padding: '4px 10px', fontSize: '0.78rem' }} title="From date" />
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>to</span>
                            <input type="date" className="form-input" value={toDate} onChange={e => setToDate(e.target.value)}
                                style={{ width: 'auto', height: 32, padding: '4px 10px', fontSize: '0.78rem' }} title="To date" />
                            {/* View toggle */}
                            <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 6, overflow: 'hidden' }}>
                                <button className="btn btn-sm" onClick={() => setViewMode('timeline')}
                                    style={{ borderRadius: 0, background: viewMode === 'timeline' ? 'rgba(99,102,241,0.15)' : 'transparent', color: viewMode === 'timeline' ? 'var(--primary-400)' : 'var(--text-muted)', border: 'none' }}>
                                    <Icons.Activity /> Timeline
                                </button>
                                <button className="btn btn-sm" onClick={() => setViewMode('table')}
                                    style={{ borderRadius: 0, background: viewMode === 'table' ? 'rgba(99,102,241,0.15)' : 'transparent', color: viewMode === 'table' ? 'var(--primary-400)' : 'var(--text-muted)', border: 'none' }}>
                                    <Icons.ListIcon /> Table
                                </button>
                            </div>
                            <button className="btn btn-outline btn-sm" onClick={exportCSV} disabled={logs.length === 0}>
                                <Icons.Download /> Export CSV
                            </button>
                        </div>
                    </div>

                    {/* Action filter chips */}
                    <div className="filters-bar">
                        {actions.map((a) => (
                            <button key={a} className={`filter-chip ${actionFilter === a ? 'active' : ''}`} onClick={() => setActionFilter(a)}>
                                {a || 'All'}
                            </button>
                        ))}
                    </div>

                    {loading ? <SkeletonTable rows={6} cols={5} /> : logs.length === 0 ? (
                        <div className="empty-state"><div className="empty-state-icon"><Icons.Shield /></div><p>No audit logs found</p></div>
                    ) : viewMode === 'timeline' ? (
                        /* Timeline View */
                        <div style={{ position: 'relative', paddingLeft: 28 }}>
                            <div style={{ position: 'absolute', left: 11, top: 0, bottom: 0, width: 1, background: 'var(--border-color)' }} />
                            {logs.map((log) => (
                                <div key={log.id} className="audit-timeline-item">
                                    <div className="audit-timeline-dot" style={{ background: ACTION_COLORS[log.action] || 'var(--text-muted)' }}>
                                        <span style={{ color: '#fff', display: 'flex', fontSize: '0.7rem' }}>{ACTION_ICONS[log.action] || <Icons.Info />}</span>
                                    </div>
                                    <div className="audit-timeline-content">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                                            <span className={getBadgeClass(log.action)}>{log.action}</span>
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.86rem' }}>{log.user_name}</span>
                                            {log.model_name && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>· {log.model_name}</span>}
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{timeAgo(log.timestamp)}</span>
                                        </div>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{log.description}</div>
                                        {log.ip_address && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3, fontFamily: 'monospace' }}>IP: {log.ip_address}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Table View */
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>User</th>
                                        <th>Action</th>
                                        <th>Resource</th>
                                        <th>Description</th>
                                        <th>IP Address</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id}>
                                            <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td style={{ fontWeight: 500 }}>{log.user_name}</td>
                                            <td><span className={getBadgeClass(log.action)}>{log.action}</span></td>
                                            <td>{log.model_name || '—'}</td>
                                            <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.description}</td>
                                            <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{log.ip_address || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
