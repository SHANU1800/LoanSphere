import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { SkeletonTable } from '../components/Skeleton';
import api from '../api/axios';
import * as Icons from '../components/Icons';
import { useToast } from '../context/ToastContext';

// Quick score gauge (SVG speedometer)
function ScoreGauge({ score, max = 900 }) {
    if (!score) return <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>No score</span>;
    const pct = Math.min(score / max, 1);
    const r = 28, cx = 36, cy = 36;
    const arc = Math.PI; // semi-circle
    const startX = cx - r, startY = cy, endX = cx + r, endY = cy;
    const len = Math.PI * r;
    const color = score >= 750 ? 'var(--success-500)' : score >= 600 ? 'var(--warning-500)' : 'var(--danger-500)';
    return (
        <div style={{ textAlign: 'center' }}>
            <svg width="72" height="44" viewBox="0 0 72 44">
                <path d={`M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY}`} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" strokeLinecap="round" />
                <path d={`M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY}`} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
                    strokeDasharray={len} strokeDashoffset={len - len * pct} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                <text x="36" y="38" textAnchor="middle" fontSize="11" fontWeight="800" fill={color}>{score}</text>
            </svg>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: -4 }}>/ {max}</div>
        </div>
    );
}

export default function Underwriting() {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(new Set());
    const [noteModal, setNoteModal] = useState(null); // { app }
    const [noteText, setNoteText] = useState('');
    const [submittingNote, setSubmittingNote] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => { loadApps(); }, []);

    const loadApps = async () => {
        setLoading(true);
        try {
            const [r1, r2, r3, r4] = await Promise.all([
                api.get('/loans/', { params: { status: 'submitted' } }),
                api.get('/loans/', { params: { status: 'under_review' } }),
                api.get('/loans/', { params: { status: 'kyc_verified' } }),
                api.get('/loans/', { params: { status: 'credit_checked' } }),
            ]);
            setApps([
                ...(r1.data.results || []),
                ...(r2.data.results || []),
                ...(r3.data.results || []),
                ...(r4.data.results || []),
            ]);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const formatCurrency = (val) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

    const toggleSelect = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };
    const selectAll = () => selected.size === apps.length ? setSelected(new Set()) : setSelected(new Set(apps.map(a => a.id)));

    const bulkMoveToReview = async () => {
        if (!selected.size) return;
        try {
            await Promise.all([...selected].map(id => api.patch(`/loans/${id}/`, { status: 'under_review' })));
            toast(`${selected.size} application(s) moved to Under Review`, 'success');
            setSelected(new Set());
            loadApps();
        } catch { toast('Failed to update some applications', 'error'); }
    };

    const submitNote = async () => {
        if (!noteText.trim() || !noteModal) return;
        setSubmittingNote(true);
        try {
            await api.post(`/loans/${noteModal.id}/add_note/`, { note: noteText });
            toast('Note added successfully', 'success');
            setNoteModal(null);
            setNoteText('');
        } catch { toast('Failed to save note', 'error'); }
        finally { setSubmittingNote(false); }
    };

    // Priority sort: high-value first, then by status
    const sorted = [...apps].sort((a, b) => {
        if (a.status === 'submitted' && b.status !== 'submitted') return -1;
        if (b.status === 'submitted' && a.status !== 'submitted') return 1;
        return (b.loan_amount || 0) - (a.loan_amount || 0);
    });

    return (
        <>
            <Topbar title="Underwriting & Review" />
            <div className="page-content">
                <Breadcrumb />
                <div className="card">
                    <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <h3 className="card-title">Applications Pending Review</h3>
                            <span className="badge badge-submitted" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                                {apps.length} pending
                            </span>
                        </div>
                        {selected.size > 0 && (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selected.size} selected</span>
                                <button className="btn btn-outline btn-sm" onClick={bulkMoveToReview}>
                                    <Icons.RefreshCw /> Move to Under Review
                                </button>
                                <button className="btn btn-outline btn-sm" onClick={() => setSelected(new Set())}>
                                    <Icons.X /> Clear
                                </button>
                            </div>
                        )}
                    </div>

                    {loading ? <SkeletonTable rows={5} cols={8} /> : apps.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon"><Icons.Sparkles /></div>
                            <p>All caught up! No applications pending review.</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th style={{ width: 40 }}>
                                            <input type="checkbox" checked={selected.size === apps.length && apps.length > 0}
                                                onChange={selectAll} style={{ cursor: 'pointer', accentColor: 'var(--primary-500)' }} />
                                        </th>
                                        <th>Applicant ID</th>
                                        <th>Customer</th>
                                        <th>Amount</th>
                                        <th>Employment</th>
                                        <th>Income/mo</th>
                                        <th>CIBIL Score</th>
                                        <th>Status</th>
                                        <th>Submitted</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sorted.map((app) => (
                                        <tr key={app.id} style={{ background: selected.has(app.id) ? 'rgba(99,102,241,0.05)' : undefined }}>
                                            <td>
                                                <input type="checkbox" checked={selected.has(app.id)} onChange={() => toggleSelect(app.id)}
                                                    style={{ cursor: 'pointer', accentColor: 'var(--primary-500)' }} />
                                            </td>
                                            <td style={{ fontWeight: 600, color: 'var(--primary-400)' }}>{app.applicant_id}</td>
                                            <td>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{app.customer_full_name}</div>
                                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{app.customer_phone}</div>
                                            </td>
                                            <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(app.loan_amount)}</td>
                                            <td>{app.employment_type?.replace(/_/g, ' ') || '—'}</td>
                                            <td>{formatCurrency(app.monthly_income)}</td>
                                            <td><ScoreGauge score={app.cibil_score} /></td>
                                            <td><span className={`badge badge-${app.status}`}>{app.status.replace(/_/g, ' ')}</span></td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : '—'}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/applications/${app.id}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                        Review <Icons.ChevronRight />
                                                    </button>
                                                    <button className="btn btn-outline btn-sm" title="Add Note" onClick={() => { setNoteModal(app); setNoteText(''); }}>
                                                        <Icons.MessageSquare />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Note Modal */}
            {noteModal && (
                <div className="modal-overlay" onClick={() => setNoteModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3 className="modal-title">Add Underwriting Note</h3>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                            For: <strong style={{ color: 'var(--text-primary)' }}>{noteModal.customer_full_name}</strong> · {noteModal.applicant_id}
                        </div>
                        <textarea
                            className="form-textarea"
                            placeholder="Add your underwriting note or observation..."
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            style={{ minHeight: 120 }}
                            autoFocus
                        />
                        <div className="modal-actions">
                            <button className="btn btn-outline btn-sm" onClick={() => setNoteModal(null)}>Cancel</button>
                            <button className="btn btn-primary btn-sm" onClick={submitNote} disabled={submittingNote || !noteText.trim()}>
                                {submittingNote ? 'Saving...' : 'Save Note'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
