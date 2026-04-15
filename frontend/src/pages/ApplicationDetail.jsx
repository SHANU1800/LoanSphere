import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import * as Icons from '../components/Icons';
import { hasRoleAccess, ROLE_GROUPS, ROLES } from '../constants/rolePolicy';

const PIPELINE = [
    { key: 'draft', label: 'Draft' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'under_review', label: 'Under Review' },
    { key: 'kyc_verified', label: 'KYC Verified' },
    { key: 'credit_checked', label: 'Credit Checked' },
    { key: 'approved', label: 'Approved' },
    { key: 'disbursal_ready', label: 'Disbursal Ready' },
    { key: 'disbursed', label: 'Disbursed' },
];

const KYC_ACTION_ROLES = [ROLES.ADMIN, ROLES.UNDERWRITER, ROLES.CREDIT_MANAGER, ROLES.COMPLIANCE_OFFICER];
const DOCUMENT_REVIEW_ROLES = [ROLES.ADMIN, ROLES.UNDERWRITER, ROLES.CREDIT_MANAGER, ROLES.FINANCE, ROLES.OPERATIONS, ROLES.COMPLIANCE_OFFICER];
const DOCUMENT_UPLOAD_ROLES = [...DOCUMENT_REVIEW_ROLES, ROLES.AGENT, ROLES.CUSTOMER];
const FEE_RECORD_ROLES = [ROLES.ADMIN, ROLES.FINANCE, ROLES.AGENT, ROLES.OPERATIONS];

export default function ApplicationDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [app, setApp] = useState(null);
    const [docs, setDocs] = useState([]);
    const [kyc, setKyc] = useState(null);
    const [credits, setCredits] = useState([]);
    const [fees, setFees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [toast, setToast] = useState(null);

    // Document upload state
    const [docFile, setDocFile] = useState(null);
    const [docType, setDocType] = useState('other');
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const docInputRef = useRef(null);

    // Fee recording state
    const [feeAmount, setFeeAmount] = useState('');
    const [feeMode, setFeeMode] = useState('cash');
    const [feeBranch, setFeeBranch] = useState('');
    const [feeRef, setFeeRef] = useState('');
    const [feeDate, setFeeDate] = useState(new Date().toISOString().split('T')[0]);
    const [feeReceipt, setFeeReceipt] = useState(null);
    const [recordingFee, setRecordingFee] = useState(false);
    const [showFeeForm, setShowFeeForm] = useState(false);
    const feeInputRef = useRef(null);

    // Underwriting notes state
    const [editingNotes, setEditingNotes] = useState(false);
    const [notes, setNotes] = useState('');

    // Bank details state
    const [editingBank, setEditingBank] = useState(false);
    const [savingBank, setSavingBank] = useState(false);
    const [bankForm, setBankForm] = useState({ bank_account_number: '', bank_ifsc: '', bank_account_holder: '', bank_name: '' });

    // Sanction letter state
    const [showSanctionModal, setShowSanctionModal] = useState(false);
    const [sanctionData, setSanctionData] = useState(null);
    const [loadingSanction, setLoadingSanction] = useState(false);
    const [downloadingSanction, setDownloadingSanction] = useState(false);

    // Document request state
    const [showDocRequestModal, setShowDocRequestModal] = useState(false);
    const [docRequestTypes, setDocRequestTypes] = useState([]);
    const [docRequestMessage, setDocRequestMessage] = useState('');
    const [submittingDocRequest, setSubmittingDocRequest] = useState(false);

    // Comments state
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [sendingComment, setSendingComment] = useState(false);
    const commentsEndRef = useRef(null);

    useEffect(() => { loadAll(); loadComments(); }, [id]);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const loadComments = async () => {
        try {
            const res = await api.get(`/loans/${id}/comments/`);
            setComments(res.data?.results || res.data || []);
        } catch { /* endpoint may not exist yet — silent fail */ }
    };


    const sendComment = async () => {
        if (!commentText.trim()) return;
        setSendingComment(true);
        try {
            await api.post(`/loans/${id}/comments/`, { text: commentText });
            setCommentText('');
            loadComments();
            setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
        } catch { showToast('Failed to send comment', 'error'); }
        finally { setSendingComment(false); }
    };

    const loadAll = async () => {
        try {
            const [appRes, docsRes, kycRes, creditRes, feesRes] = await Promise.all([
                api.get(`/loans/${id}/`),
                api.get(`/documents/application/${id}/`).catch(() => ({ data: [] })),
                api.get(`/kyc/${id}/status/`).catch(() => ({ data: null })),
                api.get(`/kyc/${id}/credit-checks/`).catch(() => ({ data: [] })),
                api.get(`/fees/?application=${id}`).catch(() => ({ data: { results: [] } })),
            ]);
            setApp(appRes.data);
            setDocs(Array.isArray(docsRes.data) ? docsRes.data : (docsRes.data?.results || []));
            setKyc(kycRes.data);
            setCredits(Array.isArray(creditRes.data) ? creditRes.data : (creditRes.data?.results || []));
            setFees(feesRes.data?.results || feesRes.data || []);
            setNotes(appRes.data.underwriting_notes || '');
            setBankForm({
                bank_account_number: appRes.data.bank_account_number || '',
                bank_ifsc: appRes.data.bank_ifsc || '',
                bank_account_holder: appRes.data.bank_account_holder || '',
                bank_name: appRes.data.bank_name || '',
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        setActionLoading('approve');
        try {
            await api.post(`/loans/${id}/approve/`, {});
            loadAll();
        } catch (err) { alert(err.response?.data?.error || 'Error'); }
        finally { setActionLoading(''); }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) return;
        setActionLoading('reject');
        try {
            await api.post(`/loans/${id}/reject/`, { rejection_reason: rejectReason });
            setShowRejectModal(false);
            loadAll();
        } catch (err) { alert(err.response?.data?.error || 'Error'); }
        finally { setActionLoading(''); }
    };

    const triggerKYC = async (type) => {
        setActionLoading(`kyc-${type}`);
        try {
            await api.post(`/kyc/${id}/verify-${type}/`);
            loadAll();
        } catch (err) { console.error(err); }
        finally { setActionLoading(''); }
    };

    const triggerCredit = async (bureau) => {
        setActionLoading(`credit-${bureau}`);
        try {
            await api.post(`/kyc/${id}/credit-check/`, { bureau });
            loadAll();
        } catch (err) { console.error(err); }
        finally { setActionLoading(''); }
    };

    const handleMarkDisbursalReady = async () => {
        setActionLoading('disbursal-ready');
        try {
            await api.post(`/loans/${id}/disbursal-ready/`);
            showToast('Application marked as disbursal-ready!');
            loadAll();
        } catch (err) { showToast(err.response?.data?.error || 'Error', 'error'); }
        finally { setActionLoading(''); }
    };

    const handleDisburse = async () => {
        setActionLoading('disburse');
        try {
            await api.post(`/loans/${id}/disburse/`);
            showToast('Application marked as disbursed!');
            loadAll();
        } catch (err) { showToast(err.response?.data?.error || 'Error', 'error'); }
        finally { setActionLoading(''); }
    };

    const handleUploadDoc = async (e) => {
        e.preventDefault();
        if (!docFile) { showToast('Please select a file', 'error'); return; }
        setUploadingDoc(true);
        try {
            const fd = new FormData();
            fd.append('application', id);
            fd.append('doc_type', docType);
            fd.append('file', docFile);
            fd.append('file_name', docFile.name);
            fd.append('file_size', docFile.size);
            await api.post('/documents/upload/', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setDocFile(null);
            if (docInputRef.current) docInputRef.current.value = '';
            showToast('Document uploaded successfully!');
            loadAll();
        } catch (err) { showToast(err.response?.data?.error || 'Upload failed', 'error'); }
        finally { setUploadingDoc(false); }
    };

    const handleRecordFee = async (e) => {
        e.preventDefault();
        if (!feeAmount || parseFloat(feeAmount) <= 0) { showToast('Enter valid amount', 'error'); return; }
        setRecordingFee(true);
        try {
            const fd = new FormData();
            fd.append('application', id);
            fd.append('amount', feeAmount);
            fd.append('payment_mode', feeMode);
            fd.append('payment_date', feeDate);
            if (feeBranch) fd.append('branch_name', feeBranch);
            if (feeRef) fd.append('transaction_reference', feeRef);
            if (feeReceipt) { fd.append('receipt_image', feeReceipt); }
            await api.post('/fees/', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFeeAmount(''); setFeeBranch(''); setFeeRef(''); setFeeReceipt(null);
            if (feeInputRef.current) feeInputRef.current.value = '';
            setShowFeeForm(false);
            showToast('Fee recorded successfully!');
            loadAll();
        } catch (err) { showToast(err.response?.data?.error || 'Fee recording failed', 'error'); }
        finally { setRecordingFee(false); }
    };

    const handleVerifyDoc = async (docId, docStatus) => {
        try {
            await api.patch(`/documents/${docId}/verify/`, { status: docStatus });
            showToast(`Document ${docStatus}!`);
            loadAll();
        } catch (err) { showToast('Error updating document', 'error'); }
    };

    const handleSaveNotes = async () => {
        try {
            await api.patch(`/loans/${id}/status/`, { status: app.status, notes });
            setEditingNotes(false);
            showToast('Notes saved!');
            loadAll();
        } catch (err) { showToast('Error saving notes', 'error'); }
    };

    const handleSaveBankDetails = async (e) => {
        e.preventDefault();
        if (!bankForm.bank_account_number.trim() || !bankForm.bank_ifsc.trim()) {
            showToast('Account number and IFSC are required', 'error');
            return;
        }
        setSavingBank(true);
        try {
            await api.patch(`/loans/${id}/`, bankForm);
            setEditingBank(false);
            showToast('Bank details saved!');
            loadAll();
        } catch (err) { showToast(err.response?.data?.error || 'Error saving bank details', 'error'); }
        finally { setSavingBank(false); }
    };

    const handleDocumentRequest = async (e) => {
        e.preventDefault();
        if (docRequestTypes.length === 0) { showToast('Select at least one document type', 'error'); return; }
        setSubmittingDocRequest(true);
        try {
            await api.post(`/documents/request/${id}/`, { doc_types: docRequestTypes, message: docRequestMessage });
            showToast('Document request sent to agent!');
            setShowDocRequestModal(false);
            setDocRequestTypes([]);
            setDocRequestMessage('');
            loadAll();
        } catch (err) { showToast(err.response?.data?.error || 'Error sending request', 'error'); }
        finally { setSubmittingDocRequest(false); }
    };

    const toggleDocType = (type) => {
        setDocRequestTypes((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]);
    };

    const handleFetchSanctionLetter = async () => {
        setLoadingSanction(true);
        try {
            const res = await api.get(`/loans/${id}/sanction-letter/`);
            setSanctionData(res.data);
            setShowSanctionModal(true);
        } catch (err) { showToast(err.response?.data?.error || 'Error loading sanction letter', 'error'); }
        finally { setLoadingSanction(false); }
    };

    const handlePrintSanction = () => {
        const printContent = document.getElementById('sanction-letter-content');
        if (!printContent) return;
        const win = window.open('', '_blank');
        win.document.write('<html><head><title>Sanction Letter</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#111;} h1,h2{color:#1e3a5f;} table{width:100%;border-collapse:collapse;margin:16px 0;} td,th{border:1px solid #ddd;padding:8px;} .sig{margin-top:60px;} </style></head><body>' + printContent.innerHTML + '</body></html>');
        win.document.close();
        win.focus();
        win.print();
        win.close();
    };

    const handleDownloadSanctionPDF = async () => {
        setDownloadingSanction(true);
        try {
            const res = await api.get(`/loans/${id}/sanction-letter/pdf/`, { responseType: 'blob' });
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `sanction_letter_${app.applicant_id}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            showToast('Sanction letter PDF downloaded!');
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to download PDF', 'error');
        } finally {
            setDownloadingSanction(false);
        }
    };

    const formatCurrency = (val) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

    const maskPan = (pan) => {
        if (!pan || pan.length < 10) return pan || '—';
        return `${pan.slice(0, 2)}******${pan.slice(-2)}`;
    };

    if (loading) return (
        <>
            <Topbar title="Application Detail" />
            <div className="page-content"><div className="loading-spinner"><div className="spinner"></div></div></div>
        </>
    );

    if (!app) return (
        <>
            <Topbar title="Application Detail" />
            <div className="page-content"><div className="empty-state">Application not found</div></div>
        </>
    );

    const role = user?.role;
    const canProcess = !['approved', 'rejected', 'disbursed'].includes(app.status);
    const canLoanDecision = hasRoleAccess(role, ROLE_GROUPS.LOAN_DECISION);
    const canKYCActions = hasRoleAccess(role, KYC_ACTION_ROLES);
    const canReviewDocuments = hasRoleAccess(role, DOCUMENT_REVIEW_ROLES);
    const canUploadDocuments = hasRoleAccess(role, DOCUMENT_UPLOAD_ROLES);
    const canRecordFees = hasRoleAccess(role, FEE_RECORD_ROLES);
    const currentPipelineIndex = PIPELINE.findIndex((s) => s.key === app.status);

    const pendingDocs = docs.filter((d) => d.verification_status === 'pending').length;
    const aadhaarVerified = kyc?.aadhaar_status === 'verified';
    const panVerified = kyc?.pan_status === 'verified';
    const hasCredit = credits.length > 0;
    const hasBank = !!app.bank_account_number && !!app.bank_ifsc;

    let nextAction = null;
    if (app.status === 'rejected' || app.status === 'disbursed') {
        nextAction = null;
    } else if (!aadhaarVerified && canKYCActions) {
        nextAction = { label: 'Verify Aadhaar', onClick: () => triggerKYC('aadhaar'), loading: actionLoading === 'kyc-aadhaar' };
    } else if (!panVerified && canKYCActions) {
        nextAction = { label: 'Verify PAN', onClick: () => triggerKYC('pan'), loading: actionLoading === 'kyc-pan' };
    } else if (!hasCredit && canKYCActions) {
        nextAction = { label: 'Run CIBIL Check', onClick: () => triggerCredit('cibil'), loading: actionLoading === 'credit-cibil' };
    } else if (pendingDocs > 0 && canReviewDocuments) {
        nextAction = { label: 'Review Pending Documents', onClick: () => window.scrollTo({ top: 900, behavior: 'smooth' }), loading: false };
    } else if (app.status === 'approved' && !hasBank && canLoanDecision) {
        nextAction = { label: 'Add Bank Details', onClick: () => setEditingBank(true), loading: false };
    } else if (app.status === 'approved' && canLoanDecision) {
        nextAction = { label: 'Mark Disbursal Ready', onClick: handleMarkDisbursalReady, loading: actionLoading === 'disbursal-ready' };
    } else if (app.status === 'disbursal_ready' && canLoanDecision) {
        nextAction = { label: 'Mark Disbursed', onClick: handleDisburse, loading: actionLoading === 'disburse' };
    } else if (['approved', 'disbursal_ready'].includes(app.status)) {
        nextAction = { label: 'Open Sanction Letter', onClick: handleFetchSanctionLetter, loading: loadingSanction };
    }

    return (
        <>
            <Topbar title={`Application ${app.applicant_id}`} />
            <div className="page-content">
                <Breadcrumb />
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/applications')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.ArrowLeft /> Back</button>
                    <span className={`badge badge-${app.status}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                        {app.status.replace(/_/g, ' ')}
                    </span>
                    {app.loan_account_number && (
                        <span style={{ color: 'var(--success-500)', fontWeight: 600, fontSize: '0.9rem' }}>
                            Loan A/C: {app.loan_account_number}
                        </span>
                    )}
                    <div style={{ flex: 1 }} />
                    {canProcess && canLoanDecision && (
                        <>
                            <button className="btn btn-success btn-sm" onClick={handleApprove} disabled={!!actionLoading}>
                                {actionLoading === 'approve' ? 'Processing...' : 'Approve'}
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => setShowRejectModal(true)} disabled={!!actionLoading}>
                                Reject
                            </button>
                        </>
                    )}
                    {app.status === 'approved' && canLoanDecision && (
                        <button className="btn btn-outline btn-sm" style={{ borderColor: 'var(--accent-500)', color: 'var(--accent-500)' }}
                            onClick={handleMarkDisbursalReady} disabled={!!actionLoading}>
                            {actionLoading === 'disbursal-ready' ? '...' : 'Mark Disbursal Ready'}
                        </button>
                    )}
                    {app.status === 'disbursal_ready' && canLoanDecision && (
                        <button className="btn btn-success btn-sm" onClick={handleDisburse} disabled={!!actionLoading}>
                            {actionLoading === 'disburse' ? 'Processing...' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.CheckCircle /> Mark Disbursed</span>}
                        </button>
                    )}
                    {['approved', 'disbursal_ready', 'disbursed'].includes(app.status) && (
                        <button className="btn btn-outline btn-sm" style={{ borderColor: 'var(--primary-400)', color: 'var(--primary-400)' }}
                            onClick={handleFetchSanctionLetter} disabled={loadingSanction}>
                            {loadingSanction ? '...' : 'Sanction Letter'}
                        </button>
                    )}
                </div>

                <div className="card" style={{ marginBottom: '20px' }}>
                    <h3 className="card-title" style={{ marginBottom: '14px' }}>Application Progress</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                        {PIPELINE.map((step, idx) => {
                            const isDone = currentPipelineIndex >= idx;
                            const isCurrent = app.status === step.key;
                            return (
                                <div
                                    key={step.key}
                                    style={{
                                        padding: '7px 11px',
                                        borderRadius: '999px',
                                        border: `1px solid ${isCurrent ? 'var(--primary-500)' : 'var(--border-color)'}`,
                                        background: isCurrent ? 'rgba(99,102,241,0.15)' : isDone ? 'rgba(16,185,129,0.1)' : 'transparent',
                                        color: isCurrent ? 'var(--primary-300)' : isDone ? 'var(--success-500)' : 'var(--text-muted)',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                    }}
                                >
                                    {isDone ? <span style={{ marginRight: 6, display: 'inline-flex', verticalAlign: 'middle' }}><Icons.Check /></span> : null}{step.label}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="detail-grid">
                    {/* Left Column */}
                    <div>
                        {/* Customer Info */}
                        <div className="card" style={{ marginBottom: '20px' }}>
                            <h3 className="card-title" style={{ marginBottom: '16px' }}>Customer Information</h3>
                            <div className="form-row">
                                <div className="detail-section">
                                    <div className="detail-row"><span className="detail-label">Full Name</span><span className="detail-value">{app.customer_first_name} {app.customer_last_name}</span></div>
                                    <div className="detail-row"><span className="detail-label">Phone</span><span className="detail-value">{app.customer_phone}</span></div>
                                    <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{app.customer_email || '—'}</span></div>
                                    <div className="detail-row"><span className="detail-label">DOB</span><span className="detail-value">{app.customer_dob || '—'}</span></div>
                                    <div className="detail-row"><span className="detail-label">Gender</span><span className="detail-value">{app.customer_gender || '—'}</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Identity */}
                        <div className="card" style={{ marginBottom: '20px' }}>
                            <h3 className="card-title" style={{ marginBottom: '16px', display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.FileText /> Identity & Address</h3>
                            <div className="detail-row"><span className="detail-label">Aadhaar</span><span className="detail-value">{app.aadhaar_number ? `XXXX-XXXX-${app.aadhaar_number.slice(-4)}` : '—'}</span></div>
                            <div className="detail-row"><span className="detail-label">PAN</span><span className="detail-value">{maskPan(app.pan_number)}</span></div>
                            <div className="detail-row"><span className="detail-label">Address</span><span className="detail-value">{[app.address_line1, app.city, app.state, app.pincode].filter(Boolean).join(', ') || '—'}</span></div>
                        </div>

                        {/* Employment */}
                        <div className="card" style={{ marginBottom: '20px' }}>
                            <h3 className="card-title" style={{ marginBottom: '16px', display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.Briefcase /> Employment & Income</h3>
                            <div className="detail-row"><span className="detail-label">Employment Type</span><span className="detail-value">{app.employment_type?.replace(/_/g, ' ') || '—'}</span></div>
                            <div className="detail-row"><span className="detail-label">Employer</span><span className="detail-value">{app.employer_name || '—'}</span></div>
                            {app.employer_address && <div className="detail-row"><span className="detail-label">Employer Address</span><span className="detail-value">{app.employer_address}</span></div>}
                            <div className="detail-row"><span className="detail-label">Monthly Income</span><span className="detail-value">{formatCurrency(app.monthly_income)}</span></div>
                            <div className="detail-row"><span className="detail-label">Annual Income</span><span className="detail-value">{formatCurrency(app.annual_income)}</span></div>
                        </div>

                        {/* Loan Details */}
                        <div className="card" style={{ marginBottom: '20px' }}>
                            <h3 className="card-title" style={{ marginBottom: '16px', display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.Wallet /> Loan Details</h3>
                            <div className="detail-row"><span className="detail-label">Loan Amount</span><span className="detail-value" style={{ color: 'var(--primary-400)', fontSize: '1.1rem' }}>{formatCurrency(app.loan_amount)}</span></div>
                            <div className="detail-row"><span className="detail-label">Tenure</span><span className="detail-value">{app.loan_tenure_months} months</span></div>
                            <div className="detail-row"><span className="detail-label">Interest Rate</span><span className="detail-value">{app.interest_rate}%</span></div>
                            <div className="detail-row"><span className="detail-label">Purpose</span><span className="detail-value">{app.loan_purpose || '—'}</span></div>
                        </div>

                        {/* Bank Details */}
                        <div className="card" style={{ marginBottom: '20px' }}>
                            <div className="card-header" style={{ marginBottom: '12px' }}>
                                <h3 className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.CreditCard /> Bank Account</h3>
                                {['approved', 'disbursal_ready'].includes(app.status) && !editingBank && canLoanDecision && (
                                    <button className="btn btn-outline btn-sm" onClick={() => setEditingBank(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.Edit /> Edit</button>
                                )}
                                {editingBank && canLoanDecision && (
                                    <button className="btn btn-outline btn-sm" onClick={() => { setEditingBank(false); setBankForm({ bank_account_number: app.bank_account_number || '', bank_ifsc: app.bank_ifsc || '', bank_account_holder: app.bank_account_holder || '', bank_name: app.bank_name || '' }); }}>Cancel</button>
                                )}
                            </div>
                            {editingBank ? (
                                <form onSubmit={handleSaveBankDetails}>
                                    <div className="form-row" style={{ marginBottom: '10px' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Account Number *</label>
                                            <input className="form-input" value={bankForm.bank_account_number} required
                                                onChange={(e) => setBankForm((p) => ({ ...p, bank_account_number: e.target.value }))} placeholder="1234567890" />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">IFSC Code *</label>
                                            <input className="form-input" value={bankForm.bank_ifsc} required maxLength={11}
                                                onChange={(e) => setBankForm((p) => ({ ...p, bank_ifsc: e.target.value.toUpperCase() }))} placeholder="SBIN0001234" />
                                        </div>
                                    </div>
                                    <div className="form-row" style={{ marginBottom: '10px' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Account Holder Name</label>
                                            <input className="form-input" value={bankForm.bank_account_holder}
                                                onChange={(e) => setBankForm((p) => ({ ...p, bank_account_holder: e.target.value }))} placeholder="Full name as per bank" />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Bank Name</label>
                                            <input className="form-input" value={bankForm.bank_name}
                                                onChange={(e) => setBankForm((p) => ({ ...p, bank_name: e.target.value }))} placeholder="State Bank of India" />
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn-primary btn-sm" disabled={savingBank}>
                                        {savingBank ? 'Saving...' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.Save /> Save Bank Details</span>}
                                    </button>
                                </form>
                            ) : app.bank_account_number ? (
                                <>
                                    <div className="detail-row"><span className="detail-label">Account No.</span><span className="detail-value">{app.bank_account_number}</span></div>
                                    <div className="detail-row"><span className="detail-label">IFSC</span><span className="detail-value">{app.bank_ifsc}</span></div>
                                    <div className="detail-row"><span className="detail-label">Account Holder</span><span className="detail-value">{app.bank_account_holder || '—'}</span></div>
                                    <div className="detail-row"><span className="detail-label">Bank</span><span className="detail-value">{app.bank_name || '—'}</span></div>
                                </>
                            ) : (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    {['approved', 'disbursal_ready'].includes(app.status)
                                        ? 'No bank details added. Click Edit to add bank account for disbursal.'
                                        : 'Bank details not provided.'}
                                </p>
                            )}
                        </div>

                        {/* Underwriting Notes */}
                        <div className="card" style={{ marginBottom: '20px' }}>
                            <div className="card-header" style={{ marginBottom: '12px' }}>
                                <h3 className="card-title">Underwriting Notes</h3>
                                {!editingNotes && canLoanDecision ? (
                                    <button className="btn btn-outline btn-sm" onClick={() => setEditingNotes(true)}>Edit</button>
                                ) : editingNotes ? (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="btn btn-primary btn-sm" onClick={handleSaveNotes}>Save</button>
                                        <button className="btn btn-outline btn-sm" onClick={() => { setEditingNotes(false); setNotes(app.underwriting_notes || ''); }}>Cancel</button>
                                    </div>
                                ) : null}
                            </div>
                            {editingNotes ? (
                                <textarea className="form-textarea" value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add underwriting notes, observations..." />
                            ) : (
                                <>
                                    {app.underwriting_notes
                                        ? <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{app.underwriting_notes}</p>
                                        : <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No underwriting notes yet</p>}
                                    {app.rejection_reason && (
                                        <p style={{ color: 'var(--danger-500)', marginTop: '8px', fontSize: '0.85rem' }}>
                                            <strong>Rejection Reason:</strong> {app.rejection_reason}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div>
                        {nextAction && (
                            <div className="card" style={{ marginBottom: '20px', border: '1px solid rgba(99,102,241,0.35)' }}>
                                <h3 className="card-title" style={{ marginBottom: '10px', display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.Zap /> Next Best Action</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '12px' }}>
                                    Recommended next step to move this application forward quickly.
                                </p>
                                <button className="btn btn-primary btn-sm" onClick={nextAction.onClick} disabled={nextAction.loading}>
                                    {nextAction.loading ? 'Working...' : nextAction.label}
                                </button>
                            </div>
                        )}

                        {/* KYC Status */}
                        <div className="card" style={{ marginBottom: '20px' }}>
                            <h3 className="card-title" style={{ marginBottom: '16px', display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.Lock /> KYC Verification</h3>
                            <div className="detail-row">
                                <span className="detail-label">Aadhaar</span>
                                <span className={`badge badge-${kyc?.aadhaar_status || 'pending'}`}>
                                    {kyc?.aadhaar_status || 'pending'}
                                </span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">PAN</span>
                                <span className={`badge badge-${kyc?.pan_status || 'pending'}`}>
                                    {kyc?.pan_status || 'pending'}
                                </span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Integration Mode</span>
                                <span className="detail-value" style={{ textTransform: 'capitalize' }}>
                                    {kyc?.aadhaar_response_data?.integration_mode || kyc?.pan_response_data?.integration_mode || '—'}
                                </span>
                            </div>
                            {canProcess && canKYCActions && (
                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                    <button className="btn btn-outline btn-sm" onClick={() => triggerKYC('aadhaar')} disabled={!!actionLoading}>
                                        {actionLoading === 'kyc-aadhaar' ? '...' : 'Verify Aadhaar'}
                                    </button>
                                    <button className="btn btn-outline btn-sm" onClick={() => triggerKYC('pan')} disabled={!!actionLoading}>
                                        {actionLoading === 'kyc-pan' ? '...' : 'Verify PAN'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Credit Checks */}
                        <div className="card" style={{ marginBottom: '20px' }}>
                            <h3 className="card-title" style={{ marginBottom: '16px', display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.BarChart /> Credit Scores</h3>
                            {credits.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No credit checks yet</p>
                            ) : credits.map((c) => (
                                <div key={c.id}>
                                    <div className="detail-row">
                                        <span className="detail-label">{c.bureau_display}</span>
                                        <span className="detail-value" style={{
                                            color: c.score >= 750 ? 'var(--success-500)' : c.score >= 650 ? 'var(--warning-500)' : 'var(--danger-500)'
                                        }}>
                                            {c.score}
                                        </span>
                                    </div>
                                    <div className="detail-row" style={{ marginTop: '-4px' }}>
                                        <span className="detail-label" style={{ fontSize: '0.75rem' }}>Mode</span>
                                        <span className="detail-value" style={{ fontSize: '0.75rem', textTransform: 'capitalize', color: 'var(--text-muted)' }}>
                                            {c.raw_response?.integration_mode || '—'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {canProcess && canKYCActions && (
                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                    <button className="btn btn-outline btn-sm" onClick={() => triggerCredit('cibil')} disabled={!!actionLoading}>
                                        {actionLoading === 'credit-cibil' ? '...' : 'Check CIBIL'}
                                    </button>
                                    <button className="btn btn-outline btn-sm" onClick={() => triggerCredit('crif')} disabled={!!actionLoading}>
                                        {actionLoading === 'credit-crif' ? '...' : 'Check CRIF'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Documents */}
                        <div className="card" style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 className="card-title" style={{ margin: 0 }}>Documents ({docs.length})</h3>
                                {canReviewDocuments && (
                                    <button className="btn btn-outline btn-sm" onClick={() => setShowDocRequestModal(true)}>Request Docs</button>
                                )}
                            </div>
                            {docs.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px' }}>No documents uploaded</p>
                            ) : docs.map((doc) => (
                                <div key={doc.id} className="detail-row" style={{ alignItems: 'center' }}>
                                    <span className="detail-label">{doc.doc_type_display || doc.doc_type}</span>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <span className={`badge badge-${doc.verification_status}`}>{doc.verification_status}</span>
                                        {doc.verification_status === 'pending' && canReviewDocuments && (
                                            <>
                                                <button className="btn btn-sm" style={{ padding: '3px 8px', fontSize: '0.72rem', background: 'rgba(16,185,129,0.1)', color: 'var(--success-500)', border: '1px solid rgba(16,185,129,0.2)' }}
                                                    onClick={() => handleVerifyDoc(doc.id, 'verified')}><Icons.Check /></button>
                                                <button className="btn btn-sm" style={{ padding: '3px 8px', fontSize: '0.72rem', background: 'rgba(239,68,68,0.1)', color: 'var(--danger-500)', border: '1px solid rgba(239,68,68,0.2)' }}
                                                    onClick={() => handleVerifyDoc(doc.id, 'rejected')}><Icons.X /></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {/* Upload Form */}
                            {canUploadDocuments && (
                            <form onSubmit={handleUploadDoc} style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                                <div className="form-row" style={{ marginBottom: '8px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Document Type</label>
                                        <select className="form-input" value={docType} onChange={(e) => setDocType(e.target.value)}>
                                            {[['aadhaar','Aadhaar'],['pan','PAN'],['address_proof','Address Proof'],['income_proof','Income Proof'],['customer_photo','Customer Photo'],['bank_statement','Bank Statement'],['salary_slip','Salary Slip'],['disbursal_form','Disbursal Form'],['sla_document','SLA Document'],['fee_receipt','Fee Receipt'],['other','Other']].map(([v,l]) => (
                                                <option key={v} value={v}>{l}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Select File</label>
                                        <input type="file" className="form-input" ref={docInputRef}
                                            onChange={(e) => setDocFile(e.target.files[0] || null)}
                                            accept=".pdf,.jpg,.jpeg,.png,.webp" />
                                    </div>
                                </div>
                                {docFile && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{docFile.name}</p>}
                                <button type="submit" className="btn btn-outline btn-sm" disabled={uploadingDoc || !docFile}>
                                    {uploadingDoc ? 'Uploading...' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.Upload /> Upload Document</span>}
                                </button>
                            </form>
                            )}
                        </div>

                        {/* Fees */}
                        <div className="card" style={{ marginBottom: '20px' }}>
                            <div className="card-header" style={{ marginBottom: '12px' }}>
                                <h3 className="card-title">Fees ({fees.length})</h3>
                                {canRecordFees && (
                                <button className="btn btn-outline btn-sm" onClick={() => setShowFeeForm((f) => !f)}>
                                    {showFeeForm ? 'Cancel' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.Plus /> Record Fee</span>}
                                </button>
                                )}
                            </div>
                            {fees.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No fees recorded</p>
                            ) : fees.map((fee) => (
                                <div key={fee.id} className="detail-row">
                                    <span className="detail-label">
                                        {formatCurrency(fee.amount)}
                                        <span style={{ color: 'var(--text-muted)', marginLeft: '6px', fontSize: '0.78rem' }}>
                                            ({fee.payment_mode_display || fee.payment_mode})
                                        </span>
                                    </span>
                                    <span className={`badge badge-${fee.status}`}>{fee.status_display || fee.status}</span>
                                </div>
                            ))}
                            {showFeeForm && canRecordFees && (
                                <form onSubmit={handleRecordFee} style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                                    <div className="form-row" style={{ marginBottom: '10px' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Amount (₹) *</label>
                                            <input type="number" className="form-input" value={feeAmount} min="1"
                                                onChange={(e) => setFeeAmount(e.target.value)} placeholder="500" required />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Payment Mode</label>
                                            <select className="form-input" value={feeMode} onChange={(e) => setFeeMode(e.target.value)}>
                                                <option value="cash">Cash</option>
                                                <option value="branch_deposit">Branch Deposit</option>
                                                <option value="online">Online</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-row" style={{ marginBottom: '10px' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Branch Name</label>
                                            <input className="form-input" value={feeBranch} onChange={(e) => setFeeBranch(e.target.value)} placeholder="Optional" />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Transaction Reference</label>
                                            <input className="form-input" value={feeRef} onChange={(e) => setFeeRef(e.target.value)} placeholder="Optional" />
                                        </div>
                                    </div>
                                    <div className="form-row" style={{ marginBottom: '10px' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Payment Date</label>
                                            <input type="date" className="form-input" value={feeDate}
                                                max={new Date().toISOString().split('T')[0]}
                                                onChange={(e) => setFeeDate(e.target.value)} />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Receipt Image</label>
                                            <input type="file" className="form-input" ref={feeInputRef}
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={(e) => setFeeReceipt(e.target.files[0] || null)} />
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn-primary btn-sm" disabled={recordingFee}>
                                        {recordingFee ? 'Recording...' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.DollarSign /> Record Fee</span>}
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* Timeline */}
                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: '16px', display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.Calendar /> Timeline</h3>
                            <div className="detail-row"><span className="detail-label">Created</span><span className="detail-value">{new Date(app.created_at).toLocaleString()}</span></div>
                            {app.submitted_at && <div className="detail-row"><span className="detail-label">Submitted</span><span className="detail-value">{new Date(app.submitted_at).toLocaleString()}</span></div>}
                            {app.approved_at && <div className="detail-row"><span className="detail-label">Approved</span><span className="detail-value" style={{ color: 'var(--success-500)' }}>{new Date(app.approved_at).toLocaleString()}</span></div>}
                            {app.rejected_at && <div className="detail-row"><span className="detail-label">Rejected</span><span className="detail-value" style={{ color: 'var(--danger-500)' }}>{new Date(app.rejected_at).toLocaleString()}</span></div>}
                        </div>
                    </div>
                </div>

                {/* Internal Comments Thread */}
                <div className="card" style={{ marginTop: 20 }}>
                    <div className="card-header" style={{ marginBottom: 14 }}>
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Icons.MessageSquare /> Internal Team Comments
                        </h3>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{comments.length} note{comments.length !== 1 ? 's' : ''}</span>
                    </div>

                    {comments.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '10px 0', textAlign: 'center', opacity: 0.6 }}>No comments yet. Be the first to add a note.</div>
                    ) : (
                        <div style={{ maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
                            {comments.map((c) => {
                                const initials = (c.user_name || 'U').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
                                return (
                                    <div key={c.id} className="comment-item">
                                        <div className="comment-avatar">{initials}</div>
                                        <div className="comment-body">
                                            <div className="comment-meta">
                                                <span className="comment-author">{c.user_name || 'Team Member'}</span>
                                                <span className="comment-time">{c.created_at ? new Date(c.created_at).toLocaleString() : ''}</span>
                                            </div>
                                            <div className="comment-text">{c.text}</div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={commentsEndRef} />
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'flex-end' }}>
                        <textarea
                            className="form-textarea"
                            placeholder="Add a note for the team..."
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) sendComment(); }}
                            style={{ flex: 1, minHeight: 60, resize: 'none' }}
                        />
                        <button className="btn btn-primary" onClick={sendComment} disabled={sendingComment || !commentText.trim()} style={{ alignSelf: 'flex-end', whiteSpace: 'nowrap' }}>
                            {sendingComment ? '...' : <><Icons.Send /> Send</>}
                        </button>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>Tip: Ctrl+Enter to send quickly</div>
                </div>

                {/* Sanction Letter Modal */}
                {showSanctionModal && sanctionData && (
                    <div className="modal-overlay" onClick={() => setShowSanctionModal(false)}>
                        <div className="modal" style={{ maxWidth: '700px', maxHeight: '85vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 className="modal-title" style={{ margin: 0 }}>Loan Sanction Letter</h3>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="btn btn-primary btn-sm" onClick={handlePrintSanction} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.Printer /> Print / Download</button>
                                    <button className="btn btn-outline btn-sm" onClick={handleDownloadSanctionPDF} disabled={downloadingSanction}>
                                        {downloadingSanction ? 'Preparing...' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.Download /> Download PDF</span>}
                                    </button>
                                    <button className="btn btn-outline btn-sm" onClick={() => setShowSanctionModal(false)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.X /> Close</button>
                                </div>
                            </div>
                            <div id="sanction-letter-content" style={{ fontSize: '0.88rem', lineHeight: 1.7, color: '#111' }}>
                                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                    <h2 style={{ color: 'var(--primary-600)', margin: 0 }}>LOAN SANCTION LETTER</h2>
                                    <p style={{ color: 'var(--text-muted)', margin: '4px 0' }}>Date: {sanctionData.letter_date}</p>
                                    <p style={{ margin: '4px 0' }}>Ref: {sanctionData.applicant_id}</p>
                                </div>
                                <p>To,<br /><strong>{sanctionData.applicant_name}</strong><br />{sanctionData.applicant_address}</p>
                                <p>Dear <strong>{sanctionData.applicant_name}</strong>,</p>
                                <p>We are pleased to inform you that your loan application has been <strong>sanctioned</strong> subject to the following terms and conditions:</p>
                                <table style={{ width: '100%', borderCollapse: 'collapse', margin: '16px 0', fontSize: '0.85rem' }}>
                                    <tbody>
                                        <tr style={{ background: '#f5f7fa' }}><td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 600 }}>Loan Account Number</td><td style={{ padding: '8px', border: '1px solid #ddd' }}>{sanctionData.loan_account_number}</td></tr>
                                        <tr><td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 600 }}>Sanctioned Amount</td><td style={{ padding: '8px', border: '1px solid #ddd' }}>₹{Number(sanctionData.loan_amount).toLocaleString('en-IN')}</td></tr>
                                        <tr style={{ background: '#f5f7fa' }}><td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 600 }}>Interest Rate</td><td style={{ padding: '8px', border: '1px solid #ddd' }}>{sanctionData.interest_rate}% per annum</td></tr>
                                        <tr><td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 600 }}>Loan Tenure</td><td style={{ padding: '8px', border: '1px solid #ddd' }}>{sanctionData.tenure_months} months</td></tr>
                                        <tr style={{ background: '#f5f7fa' }}><td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 600 }}>Monthly EMI</td><td style={{ padding: '8px', border: '1px solid #ddd' }}>₹{Number(sanctionData.emi).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
                                        <tr><td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 600 }}>Total Payable</td><td style={{ padding: '8px', border: '1px solid #ddd' }}>₹{Number(sanctionData.total_payable).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
                                        <tr style={{ background: '#f5f7fa' }}><td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 600 }}>Total Interest</td><td style={{ padding: '8px', border: '1px solid #ddd' }}>₹{Number(sanctionData.total_interest).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
                                        <tr><td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 600 }}>Loan Purpose</td><td style={{ padding: '8px', border: '1px solid #ddd' }}>{sanctionData.loan_purpose || '—'}</td></tr>
                                        {sanctionData.bank_account_number && <tr style={{ background: '#f5f7fa' }}><td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 600 }}>Disbursal Account</td><td style={{ padding: '8px', border: '1px solid #ddd' }}>{sanctionData.bank_account_number} ({sanctionData.bank_name})</td></tr>}
                                    </tbody>
                                </table>
                                <p><strong>Terms &amp; Conditions:</strong></p>
                                <ol style={{ paddingLeft: '20px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                    <li>The loan amount will be disbursed to the applicant's registered bank account only.</li>
                                    <li>The EMI is due on the 5th of every month. Late payment will attract penal interest.</li>
                                    <li>Pre-closure is permitted subject to applicable charges as per RBI guidelines.</li>
                                    <li>This sanction is subject to satisfactory execution of all loan agreements and documentation.</li>
                                    <li>This letter is valid for 30 days from the date of issue.</li>
                                </ol>
                                <div style={{ marginTop: '48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                                    <div><p style={{ borderTop: '1px solid #999', paddingTop: '8px', marginTop: '40px' }}>Authorised Signatory</p></div>
                                    <div><p style={{ borderTop: '1px solid #999', paddingTop: '8px', marginTop: '40px' }}>Applicant Signature</p></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reject Modal */}
                {showRejectModal && (
                    <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <h3 className="modal-title">Reject Application</h3>
                            <div className="form-group">
                                <label className="form-label">Rejection Reason *</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="Provide a detailed reason for rejection..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                />
                            </div>
                            <div className="modal-actions">
                                <button className="btn btn-outline" onClick={() => setShowRejectModal(false)}>Cancel</button>
                                <button className="btn btn-danger" onClick={handleReject} disabled={actionLoading === 'reject'}>
                                    {actionLoading === 'reject' ? 'Rejecting...' : 'Confirm Rejection'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Document Request Modal */}
                {showDocRequestModal && (
                    <div className="modal-overlay" onClick={() => setShowDocRequestModal(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <h3 className="modal-title">Request Documents from Agent</h3>
                            <form onSubmit={handleDocumentRequest}>
                                <div className="form-group">
                                    <label className="form-label">Select Required Documents</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                        {[['aadhaar','Aadhaar'],['pan','PAN'],['address_proof','Address Proof'],['income_proof','Income Proof'],['customer_photo','Photo'],['bank_statement','Bank Statement'],['salary_slip','Salary Slip'],['other','Other']].map(([v,l]) => (
                                            <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', padding: '5px 10px', borderRadius: '6px', border: `1px solid ${docRequestTypes.includes(v) ? 'var(--primary-500)' : 'var(--border-color)'}`, background: docRequestTypes.includes(v) ? 'rgba(99,102,241,0.1)' : 'transparent', fontSize: '0.82rem' }}>
                                                <input type="checkbox" checked={docRequestTypes.includes(v)} onChange={() => toggleDocType(v)} style={{ display: 'none' }} />
                                                {docRequestTypes.includes(v) ? <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 6 }}><Icons.Check /></span> : null}{l}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Message to Agent (optional)</label>
                                    <textarea className="form-textarea" rows={3} placeholder="Reason or additional instructions..." value={docRequestMessage} onChange={(e) => setDocRequestMessage(e.target.value)} />
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn btn-outline" onClick={() => setShowDocRequestModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={submittingDocRequest || docRequestTypes.length === 0}>
                                        {submittingDocRequest ? 'Sending...' : 'Send Request'}
                                    </button>
                                </div>
                            </form>
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
