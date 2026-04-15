import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import api from '../api/axios';
import * as Icons from '../components/Icons';

export default function FeeReconciliation() {
    const [fees, setFees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [summary, setSummary] = useState({ total: 0, pending: 0, verified: 0, reconciled: 0, count: 0 });
    const [toast, setToast] = useState(null);
    const [notesModal, setNotesModal] = useState(null); // { feeId, status, notes }
    const [savingNotes, setSavingNotes] = useState(false);
    const [receiptModal, setReceiptModal] = useState(null);
    const [statementFile, setStatementFile] = useState(null);
    const [batchRunning, setBatchRunning] = useState(false);
    const [batchResult, setBatchResult] = useState(null);
    const navigate = useNavigate();

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => { loadFees(); }, [filter]);

    const loadFees = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filter) params.status = filter;
            const res = await api.get('/fees/', { params });
            const data = res.data.results || res.data || [];
            setFees(data);
            // Compute summary from full list (load all when no filter)
            const allRes = filter ? await api.get('/fees/') : res;
            const allData = allRes.data.results || allRes.data || [];
            const sum = allData.reduce((acc, f) => {
                acc.count++;
                const amt = parseFloat(f.amount) || 0;
                acc.total += amt;
                if (f.status === 'pending') acc.pending += amt;
                if (f.status === 'verified') acc.verified += amt;
                if (f.status === 'reconciled') acc.reconciled += amt;
                return acc;
            }, { total: 0, pending: 0, verified: 0, reconciled: 0, count: 0 });
            setSummary(sum);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const reconcile = async (id, newStatus, notes = '') => {
        setSavingNotes(true);
        try {
            await api.patch(`/fees/${id}/reconcile/`, { status: newStatus, notes });
            showToast(`Fee marked as ${newStatus}!`);
            setNotesModal(null);
            loadFees();
        } catch (err) { showToast(err.response?.data?.error || 'Error updating fee', 'error'); }
        finally { setSavingNotes(false); }
    };

    const runBatchReconcile = async (e) => {
        e.preventDefault();
        if (!statementFile) {
            showToast('Please select a CSV statement file', 'error');
            return;
        }
        setBatchRunning(true);
        try {
            const fd = new FormData();
            fd.append('statement', statementFile);
            const res = await api.post('/fees/batch-reconcile/', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setBatchResult(res.data);
            showToast(`Batch reconciliation done: ${res.data.matched} matched`);
            loadFees();
        } catch (err) {
            showToast(err.response?.data?.error || 'Batch reconciliation failed', 'error');
        } finally {
            setBatchRunning(false);
        }
    };

    const formatCurrency = (val) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

    return (
        <>
            <Topbar title="Fee Reconciliation" />
            <div className="page-content">
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                    {[
                        { label: 'Total Records', value: summary.count, icon: <Icons.FileText />, color: 'var(--primary-400)', isCurrency: false },
                        { label: 'Total Amount', value: summary.total, icon: <Icons.DollarSign />, color: 'var(--text-primary)', isCurrency: true },
                        { label: 'Pending', value: summary.pending, icon: <Icons.Clock />, color: 'var(--warning-500)', isCurrency: true },
                        { label: 'Reconciled', value: summary.reconciled, icon: <Icons.CheckCircle />, color: 'var(--success-500)', isCurrency: true },
                    ].map((s) => (
                        <div key={s.label} className="stat-card">
                            <div className="stat-icon">{s.icon}</div>
                            <div className="stat-value" style={{ color: s.color, fontSize: s.isCurrency ? '1.1rem' : '1.8rem' }}>
                                {s.isCurrency ? formatCurrency(s.value) : s.value}
                            </div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    ))}
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.Wallet /> Fee Records</h3>
                        <div className="filters-bar" style={{ marginBottom: 0 }}>
                            {[
                                { value: '', label: 'All' },
                                { value: 'pending', label: <><Icons.Clock /> Pending</> },
                                { value: 'verified', label: <><Icons.Search /> Verified</> },
                                { value: 'reconciled', label: <><Icons.CheckCircle /> Reconciled</> },
                                { value: 'rejected', label: <><Icons.XCircle /> Rejected</> },
                            ].map((s) => (
                                <button
                                    key={s.value}
                                    className={`filter-chip ${filter === s.value ? 'active' : ''}`}
                                    onClick={() => { setFilter(s.value); setLoading(true); }}
                                >
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{s.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={runBatchReconcile} style={{ padding: '0 20px 16px', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <input
                                type="file"
                                accept=".csv"
                                className="form-input"
                                style={{ width: '300px', marginBottom: 0 }}
                                onChange={(e) => setStatementFile(e.target.files[0] || null)}
                            />
                            <button type="submit" className="btn btn-primary btn-sm" disabled={batchRunning || !statementFile}>
                                {batchRunning ? 'Reconciling...' : 'Upload Statement & Auto-Reconcile'}
                            </button>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                CSV headers: transaction_reference, amount, payment_date(optional)
                            </span>
                        </div>
                        {batchResult && (
                            <div style={{ marginTop: '10px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                Processed: <strong>{batchResult.rows_processed}</strong> | Matched: <strong style={{ color: 'var(--success-500)' }}>{batchResult.matched}</strong> | Unmatched: <strong style={{ color: 'var(--warning-500)' }}>{batchResult.unmatched}</strong>
                            </div>
                        )}
                    </form>

                    {loading ? (
                        <div className="loading-spinner"><div className="spinner"></div></div>
                    ) : fees.length === 0 ? (
                        <div className="empty-state"><div className="empty-state-icon"><Icons.Wallet /></div><p>No fee records {filter ? `with status "${filter}"` : 'found'}</p></div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Application</th>
                                        <th>Customer</th>
                                        <th>Amount</th>
                                        <th>Mode</th>
                                        <th>Branch / Ref</th>
                                        <th>Date</th>
                                        <th>Recorded By</th>
                                        <th>Receipt</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fees.map((fee) => (
                                        <tr key={fee.id}>
                                            <td>
                                                <button
                                                    style={{ background: 'none', border: 'none', color: 'var(--primary-400)', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: '0.85rem' }}
                                                    onClick={() => navigate(`/applications/${fee.application}`)}
                                                >
                                                    {fee.applicant_id || fee.application?.slice(0, 8) + '...'}
                                                </button>
                                            </td>
                                            <td style={{ fontSize: '0.85rem' }}>{fee.customer_name || '—'}</td>
                                            <td style={{ fontWeight: 700, color: 'var(--success-500)' }}>{formatCurrency(fee.amount)}</td>
                                            <td><span className="badge badge-submitted">{fee.payment_mode_display || fee.payment_mode}</span></td>
                                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {fee.branch_name && <div>{fee.branch_name}</div>}
                                                {fee.transaction_reference && <div style={{ fontFamily: 'monospace' }}>{fee.transaction_reference}</div>}
                                                {!fee.branch_name && !fee.transaction_reference && '—'}
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{new Date(fee.payment_date).toLocaleDateString('en-IN')}</td>
                                            <td style={{ fontSize: '0.82rem' }}>{fee.recorded_by_name || '—'}</td>
                                            <td>
                                                {fee.receipt_image_url ? (
                                                    <button
                                                        className="btn btn-outline btn-sm"
                                                        style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                                                        onClick={() => setReceiptModal(fee.receipt_image_url)}
                                                    >
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icons.Image /> View</span>
                                                    </button>
                                                ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>None</span>}
                                            </td>
                                            <td><span className={`badge badge-${fee.status}`}>{fee.status_display || fee.status}</span></td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    {fee.status === 'pending' && (
                                                        <button className="btn btn-success btn-sm"
                                                            onClick={() => setNotesModal({ feeId: fee.id, status: 'verified', notes: '' })}>
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icons.Check /> Verify</span>
                                                        </button>
                                                    )}
                                                    {fee.status === 'verified' && (
                                                        <button className="btn btn-primary btn-sm"
                                                            onClick={() => setNotesModal({ feeId: fee.id, status: 'reconciled', notes: '' })}>
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icons.ClipboardList /> Reconcile</span>
                                                        </button>
                                                    )}
                                                    {(fee.status === 'pending' || fee.status === 'verified') && (
                                                        <button className="btn btn-danger btn-sm"
                                                            onClick={() => setNotesModal({ feeId: fee.id, status: 'rejected', notes: '' })}>
                                                            <Icons.X />
                                                        </button>
                                                    )}
                                                    {fee.reconciliation_notes && (
                                                        <span title={fee.reconciliation_notes} style={{ cursor: 'help', display: 'inline-flex', alignItems: 'center', color: 'var(--text-muted)' }}><Icons.Info /></span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Reconciliation Notes Modal */}
                {notesModal && (
                    <div className="modal-overlay" onClick={() => setNotesModal(null)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <h3 className="modal-title">
                                {notesModal.status === 'verified'
                                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.Check /> Verify Fee</span>
                                    : notesModal.status === 'reconciled'
                                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.ClipboardList /> Reconcile Fee</span>
                                        : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.XCircle /> Reject Fee</span>
                                }
                            </h3>
                            <div className="form-group">
                                <label className="form-label">Notes {notesModal.status === 'reconciled' ? '(reference, batch no.)' : '(optional)'}</label>
                                <textarea
                                    className="form-textarea"
                                    rows={3}
                                    placeholder={notesModal.status === 'reconciled' ? 'Bank statement reference, batch ID...' : 'Optional reason...'}
                                    value={notesModal.notes}
                                    onChange={(e) => setNotesModal((m) => ({ ...m, notes: e.target.value }))}
                                />
                            </div>
                            <div className="modal-actions">
                                <button className="btn btn-outline" onClick={() => setNotesModal(null)}>Cancel</button>
                                <button
                                    className={`btn ${notesModal.status === 'rejected' ? 'btn-danger' : 'btn-primary'}`}
                                    disabled={savingNotes}
                                    onClick={() => reconcile(notesModal.feeId, notesModal.status, notesModal.notes)}
                                >
                                    {savingNotes ? 'Saving...' : `Confirm ${notesModal.status.charAt(0).toUpperCase() + notesModal.status.slice(1)}`}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Receipt Image Modal */}
                {receiptModal && (
                    <div className="modal-overlay" onClick={() => setReceiptModal(null)}>
                        <div className="modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <h3 className="modal-title" style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.Image /> Fee Receipt</h3>
                                <button className="btn btn-outline btn-sm" onClick={() => setReceiptModal(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icons.X /> Close</button>
                            </div>
                            {receiptModal.endsWith('.pdf') ? (
                                <iframe src={receiptModal} width="100%" height="400px" title="Receipt PDF" style={{ border: 'none', borderRadius: '8px' }} />
                            ) : (
                                <img src={receiptModal} alt="Fee Receipt" style={{ width: '100%', borderRadius: '8px', maxHeight: '500px', objectFit: 'contain' }} />
                            )}
                            <div style={{ marginTop: '12px', textAlign: 'center' }}>
                                <a href={receiptModal} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.ExternalLink /> Open in New Tab</span>
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {/* Toast */}
                {toast && (
                    <div className="toast-container">
                        <div className={`toast ${toast.type}`}>
                            {toast.type === 'success' ? <Icons.Check /> : <Icons.X />} {toast.msg}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
