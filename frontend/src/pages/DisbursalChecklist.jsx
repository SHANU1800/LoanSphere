import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { SkeletonTable } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';
import * as Icons from '../components/Icons';

function ChecklistRow({ label, done, icon }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ color: done ? 'var(--success-500)' : 'var(--text-muted)', flexShrink: 0 }}>
                {done ? <Icons.CheckCircle /> : <Icons.Clock />}
            </span>
            <span style={{ fontSize: '0.85rem', color: done ? 'var(--text-primary)' : 'var(--text-muted)', textDecoration: done ? 'none' : 'none' }}>
                {icon && <span style={{ marginRight: 6 }}>{icon}</span>}
                {label}
            </span>
            {done && <span className="badge badge-approved" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>Done</span>}
            {!done && <span className="badge badge-pending" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>Pending</span>}
        </div>
    );
}

export default function DisbursalChecklist() {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedApp, setSelectedApp] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null);
    const [disbursing, setDisbursing] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => { loadApps(); }, []);

    const loadApps = async () => {
        setLoading(true);
        try {
            const [r1, r2] = await Promise.all([
                api.get('/loans/', { params: { status: 'disbursal_ready' } }),
                api.get('/loans/', { params: { status: 'approved' } }),
            ]);
            const all = [...(r1.data.results || []), ...(r2.data.results || [])];
            setApps(all);
            if (all.length > 0 && !selectedApp) setSelectedApp(all[0]);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

    const markDisbursed = async (app) => {
        setDisbursing(true);
        try {
            await api.patch(`/loans/${app.id}/`, { status: 'disbursed' });
            toast(`${app.applicant_id} marked as Disbursed!`, 'success');
            setConfirmModal(null);
            loadApps();
        } catch { toast('Failed to mark as disbursed', 'error'); }
        finally { setDisbursing(false); }
    };

    const getChecklist = (app) => [
        { label: 'Loan approved by admin', done: ['approved', 'disbursal_ready', 'disbursed'].includes(app?.status) },
        { label: 'Sanction letter generated & sent', done: app?.sanction_letter_sent || false },
        { label: 'Bank account details received', done: !!(app?.bank_account_number && app?.bank_ifsc) },
        { label: 'Signed disbursal form uploaded', done: app?.disbursal_form_uploaded || false },
        { label: 'SLA documentation uploaded', done: app?.sla_docs_uploaded || false },
        { label: 'Loan Account Number assigned', done: !!(app?.loan_account_number) },
    ];

    return (
        <>
            <Topbar title="Disbursal Queue" />
            <div className="page-content">
                <Breadcrumb />

                {loading ? <SkeletonTable rows={5} cols={6} /> : apps.length === 0 ? (
                    <div className="card">
                        <div className="empty-state">
                            <div className="empty-state-icon"><Icons.Package /></div>
                            <p>No applications in disbursal queue.</p>
                            <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/applications')}>View All Applications</button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
                        {/* Application List */}
                        <div>
                            <div className="card" style={{ padding: '12px 0' }}>
                                <div style={{ padding: '0 16px 10px', borderBottom: '1px solid var(--border-color)', marginBottom: 4 }}>
                                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Icons.Package />
                                        Disbursal Queue
                                        <span className="badge badge-disbursal_ready" style={{ marginLeft: 'auto' }}>{apps.length}</span>
                                    </div>
                                </div>
                                {apps.map(app => {
                                    const checklist = getChecklist(app);
                                    const done = checklist.filter(c => c.done).length;
                                    const pct = Math.round((done / checklist.length) * 100);
                                    return (
                                        <div
                                            key={app.id}
                                            onClick={() => setSelectedApp(app)}
                                            style={{
                                                padding: '12px 16px', cursor: 'pointer',
                                                background: selectedApp?.id === app.id ? 'rgba(99,102,241,0.07)' : 'transparent',
                                                borderLeft: selectedApp?.id === app.id ? '3px solid var(--primary-500)' : '3px solid transparent',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            <div style={{ fontWeight: 700, color: 'var(--primary-400)', fontSize: '0.8rem', marginBottom: 2 }}>{app.applicant_id}</div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.86rem', marginBottom: 4 }}>{app.customer_full_name}</div>
                                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 6 }}>{fmt(app.loan_amount)}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ flex: 1, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--success-500)' : 'var(--primary-500)', borderRadius: 4, transition: 'width 0.4s ease' }} />
                                                </div>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>{done}/{checklist.length}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Checklist Detail */}
                        {selectedApp && (
                            <div>
                                <div className="card">
                                    <div className="card-header">
                                        <div>
                                            <div className="card-title" style={{ marginBottom: 4 }}>{selectedApp.customer_full_name}</div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                                                <span>{selectedApp.applicant_id}</span>
                                                {selectedApp.loan_account_number && <span>Loan: <strong style={{ color: 'var(--success-500)' }}>{selectedApp.loan_account_number}</strong></span>}
                                                <span>{fmt(selectedApp.loan_amount)}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="btn btn-outline btn-sm" onClick={() => navigate(`/applications/${selectedApp.id}`)}>
                                                <Icons.Eye /> Full Detail
                                            </button>
                                            {selectedApp.status !== 'disbursed' && (
                                                <button className="btn btn-success btn-sm" onClick={() => setConfirmModal(selectedApp)}>
                                                    <Icons.CheckCircle /> Mark Disbursed
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: 20 }}>
                                        <div className="detail-section-title">Disbursal Checklist</div>
                                        {getChecklist(selectedApp).map((item, i) => (
                                            <ChecklistRow key={i} label={item.label} done={item.done} />
                                        ))}
                                    </div>

                                    <div style={{ marginBottom: 20 }}>
                                        <div className="detail-section-title">Bank Details</div>
                                        <div className="detail-row">
                                            <span className="detail-label">Account Holder</span>
                                            <span className="detail-value">{selectedApp.bank_account_holder || '—'}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Account Number</span>
                                            <span className="detail-value" style={{ fontFamily: 'monospace' }}>{selectedApp.bank_account_number || '—'}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">IFSC Code</span>
                                            <span className="detail-value" style={{ fontFamily: 'monospace' }}>{selectedApp.bank_ifsc || '—'}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Bank Name</span>
                                            <span className="detail-value">{selectedApp.bank_name || '—'}</span>
                                        </div>
                                    </div>

                                    {selectedApp.status === 'disbursed' && (
                                        <div style={{ padding: 16, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8 }}>
                                            <div style={{ fontWeight: 700, color: 'var(--success-500)', marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.CheckCircle /> Disbursed</div>
                                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>This loan has been fully disbursed and closed.</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Confirm Modal */}
            {confirmModal && (
                <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3 className="modal-title">Confirm Disbursal</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 16 }}>
                            Are you sure you want to mark <strong style={{ color: 'var(--text-primary)' }}>{confirmModal.customer_full_name}</strong> ({confirmModal.applicant_id}) as <strong style={{ color: 'var(--success-500)' }}>Disbursed</strong>?
                        </p>
                        <div style={{ padding: 14, background: 'rgba(251,191,36,0.05)', borderRadius: 8, border: '1px solid rgba(251,191,36,0.18)', fontSize: '0.82rem', color: 'var(--warning-500)', marginBottom: 20 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.AlertTriangle /> This action cannot be undone. Ensure all documents and bank details are verified before proceeding.</span>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-outline btn-sm" onClick={() => setConfirmModal(null)}>Cancel</button>
                            <button className="btn btn-success" onClick={() => markDisbursed(confirmModal)} disabled={disbursing}>
                                {disbursing ? 'Processing...' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.CheckCircle /> Confirm Disbursed</span>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
