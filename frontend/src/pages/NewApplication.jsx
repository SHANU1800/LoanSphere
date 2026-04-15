import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import api from '../api/axios';
import * as Icons from '../components/Icons';

const STEPS = [
    { id: 1, label: 'Customer Info', icon: <Icons.User /> },
    { id: 2, label: 'Identity & Address', icon: <Icons.FileText /> },
    { id: 3, label: 'Employment & Income', icon: <Icons.Briefcase /> },
    { id: 4, label: 'Loan Details', icon: <Icons.Building /> },
];

const initialForm = {
    // Step 1 — Customer Info
    customer_first_name: '',
    customer_last_name: '',
    customer_phone: '',
    customer_email: '',
    customer_dob: '',
    customer_gender: '',
    // Step 2 — Identity & Address
    aadhaar_number: '',
    pan_number: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    // Step 3 — Employment & Income
    employment_type: '',
    employer_name: '',
    employer_address: '',
    monthly_income: '',
    annual_income: '',
    // Step 4 — Loan Details
    loan_amount: '',
    loan_tenure_months: '',
    interest_rate: '',
    loan_purpose: '',
};

const GENDER_OPTIONS = ['male', 'female', 'other'];
const EMPLOYMENT_OPTIONS = [
    { value: 'salaried', label: 'Salaried' },
    { value: 'self_employed', label: 'Self Employed' },
    { value: 'business', label: 'Business Owner' },
    { value: 'professional', label: 'Professional' },
    { value: 'agriculture', label: 'Agriculture' },
    { value: 'retired', label: 'Retired' },
    { value: 'other', label: 'Other' },
];
const LOAN_PURPOSES = [
    'Home Purchase', 'Home Renovation', 'Personal Loan', 'Business Expansion',
    'Education', 'Medical Emergency', 'Vehicle Purchase', 'Debt Consolidation', 'Other'
];

export default function NewApplication() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);

    const set = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    };

    const validateStep = () => {
        const errs = {};
        if (step === 1) {
            if (!form.customer_first_name.trim()) errs.customer_first_name = 'First name is required';
            if (!form.customer_last_name.trim()) errs.customer_last_name = 'Last name is required';
            if (!form.customer_phone.trim() || !/^\d{10}$/.test(form.customer_phone))
                errs.customer_phone = 'Enter valid 10-digit phone number';
            if (!form.customer_gender) errs.customer_gender = 'Gender is required';
        }
        if (step === 2) {
            if (!form.aadhaar_number.trim() || !/^\d{12}$/.test(form.aadhaar_number))
                errs.aadhaar_number = 'Enter valid 12-digit Aadhaar number';
            if (!form.pan_number.trim() || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan_number.toUpperCase()))
                errs.pan_number = 'Enter valid PAN (e.g. ABCDE1234F)';
            if (!form.address_line1.trim()) errs.address_line1 = 'Address is required';
            if (!form.city.trim()) errs.city = 'City is required';
            if (!form.state.trim()) errs.state = 'State is required';
            if (!form.pincode.trim() || !/^\d{6}$/.test(form.pincode)) errs.pincode = 'Enter valid 6-digit pincode';
        }
        if (step === 3) {
            if (!form.employment_type) errs.employment_type = 'Employment type is required';
            if (!form.monthly_income || parseFloat(form.monthly_income) <= 0)
                errs.monthly_income = 'Monthly income must be greater than 0';
        }
        if (step === 4) {
            if (!form.loan_amount || parseFloat(form.loan_amount) <= 0)
                errs.loan_amount = 'Loan amount must be greater than 0';
            if (!form.loan_tenure_months || parseInt(form.loan_tenure_months) < 1)
                errs.loan_tenure_months = 'Tenure must be at least 1 month';
            if (!form.interest_rate || parseFloat(form.interest_rate) <= 0)
                errs.interest_rate = 'Interest rate must be greater than 0';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const next = () => { if (validateStep()) setStep((s) => s + 1); };
    const back = () => setStep((s) => s - 1);

    const buildPayload = () => ({
        ...form,
        pan_number: form.pan_number.toUpperCase(),
        monthly_income: form.monthly_income ? parseFloat(form.monthly_income) : null,
        annual_income: form.annual_income ? parseFloat(form.annual_income) : null,
        loan_amount: form.loan_amount ? parseFloat(form.loan_amount) : null,
        loan_tenure_months: form.loan_tenure_months ? parseInt(form.loan_tenure_months) : null,
        interest_rate: form.interest_rate ? parseFloat(form.interest_rate) : null,
    });

    const saveDraft = async () => {
        setSavingDraft(true);
        try {
            const res = await api.post('/loans/', buildPayload());
            navigate(`/applications/${res.data.id}`);
        } catch (err) {
            const data = err.response?.data;
            if (data && typeof data === 'object') {
                setErrors(data);
            } else {
                alert('Error saving draft. Please check all fields.');
            }
        } finally {
            setSavingDraft(false);
        }
    };

    const submitApplication = async () => {
        if (!validateStep()) return;
        setSubmitting(true);
        try {
            // First create as draft
            const res = await api.post('/loans/', buildPayload());
            const appId = res.data.id;
            // Then submit
            await api.post(`/loans/${appId}/submit/`);
            navigate(`/applications/${appId}`);
        } catch (err) {
            const data = err.response?.data;
            if (data && typeof data === 'object') {
                setErrors(data);
            } else {
                alert('Error submitting application. Please check all fields.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const err = (field) => errors[field] ? <span className="form-error">{errors[field]}</span> : null;
    const inp = (field) => errors[field] ? 'form-input error' : 'form-input';

    return (
        <>
            <Topbar title="New Loan Application" />
            <div className="page-content">
                {/* Step Progress */}
                <div className="step-progress">
                    {STEPS.map((s) => (
                        <div key={s.id} className={`step-item ${step === s.id ? 'active' : step > s.id ? 'done' : ''}`}>
                            <div className="step-circle">
                                {step > s.id ? <Icons.Check /> : s.icon}
                            </div>
                            <span className="step-label">{s.label}</span>
                            {s.id < STEPS.length && <div className={`step-connector ${step > s.id ? 'done' : ''}`} />}
                        </div>
                    ))}
                </div>

                <div className="card" style={{ maxWidth: '800px', marginTop: '24px' }}>
                    {/* Step 1 — Customer Info */}
                    {step === 1 && (
                        <>
                            <h3 className="card-title" style={{ marginBottom: '24px' }}>Customer Information</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">First Name *</label>
                                    <input className={inp('customer_first_name')} value={form.customer_first_name}
                                        onChange={(e) => set('customer_first_name', e.target.value)} placeholder="John" />
                                    {err('customer_first_name')}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last Name *</label>
                                    <input className={inp('customer_last_name')} value={form.customer_last_name}
                                        onChange={(e) => set('customer_last_name', e.target.value)} placeholder="Doe" />
                                    {err('customer_last_name')}
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Phone Number *</label>
                                    <input className={inp('customer_phone')} value={form.customer_phone} maxLength={10}
                                        onChange={(e) => set('customer_phone', e.target.value.replace(/\D/g, ''))}
                                        placeholder="9876543210" />
                                    {err('customer_phone')}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email Address</label>
                                    <input type="email" className={inp('customer_email')} value={form.customer_email}
                                        onChange={(e) => set('customer_email', e.target.value)} placeholder="john@example.com" />
                                    {err('customer_email')}
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Date of Birth</label>
                                    <input type="date" className={inp('customer_dob')} value={form.customer_dob}
                                        max={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => set('customer_dob', e.target.value)} />
                                    {err('customer_dob')}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Gender *</label>
                                    <select className={inp('customer_gender')} value={form.customer_gender}
                                        onChange={(e) => set('customer_gender', e.target.value)}>
                                        <option value="">Select Gender</option>
                                        {GENDER_OPTIONS.map((g) => (
                                            <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                                        ))}
                                    </select>
                                    {err('customer_gender')}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Step 2 — Identity & Address */}
                    {step === 2 && (
                        <>
                            <h3 className="card-title" style={{ marginBottom: '24px' }}>Identity &amp; Address</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Aadhaar Number * (12 digits)</label>
                                    <input className={inp('aadhaar_number')} value={form.aadhaar_number} maxLength={12}
                                        onChange={(e) => set('aadhaar_number', e.target.value.replace(/\D/g, ''))}
                                        placeholder="123456789012" />
                                    {err('aadhaar_number')}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">PAN Number *</label>
                                    <input className={inp('pan_number')} value={form.pan_number} maxLength={10}
                                        onChange={(e) => set('pan_number', e.target.value.toUpperCase())}
                                        placeholder="ABCDE1234F" />
                                    {err('pan_number')}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Address Line 1 *</label>
                                <input className={inp('address_line1')} value={form.address_line1}
                                    onChange={(e) => set('address_line1', e.target.value)} placeholder="House No., Street" />
                                {err('address_line1')}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Address Line 2</label>
                                <input className="form-input" value={form.address_line2}
                                    onChange={(e) => set('address_line2', e.target.value)} placeholder="Landmark, Area (optional)" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">City *</label>
                                    <input className={inp('city')} value={form.city}
                                        onChange={(e) => set('city', e.target.value)} placeholder="Mumbai" />
                                    {err('city')}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">State *</label>
                                    <input className={inp('state')} value={form.state}
                                        onChange={(e) => set('state', e.target.value)} placeholder="Maharashtra" />
                                    {err('state')}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Pincode *</label>
                                    <input className={inp('pincode')} value={form.pincode} maxLength={6}
                                        onChange={(e) => set('pincode', e.target.value.replace(/\D/g, ''))} placeholder="400001" />
                                    {err('pincode')}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Step 3 — Employment & Income */}
                    {step === 3 && (
                        <>
                            <h3 className="card-title" style={{ marginBottom: '24px' }}>Employment &amp; Income</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Employment Type *</label>
                                    <select className={inp('employment_type')} value={form.employment_type}
                                        onChange={(e) => set('employment_type', e.target.value)}>
                                        <option value="">Select Type</option>
                                        {EMPLOYMENT_OPTIONS.map((o) => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                    {err('employment_type')}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Employer / Company Name</label>
                                    <input className="form-input" value={form.employer_name}
                                        onChange={(e) => set('employer_name', e.target.value)} placeholder="ABC Corporation" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Employer Address</label>
                                <input className="form-input" value={form.employer_address}
                                    onChange={(e) => set('employer_address', e.target.value)} placeholder="Office address (optional)" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Monthly Income (₹) *</label>
                                    <input type="number" className={inp('monthly_income')} value={form.monthly_income}
                                        onChange={(e) => set('monthly_income', e.target.value)} placeholder="50000" min="0" />
                                    {err('monthly_income')}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Annual Income (₹)</label>
                                    <input type="number" className="form-input" value={form.annual_income}
                                        onChange={(e) => set('annual_income', e.target.value)} placeholder="600000" min="0" />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Step 4 — Loan Details */}
                    {step === 4 && (
                        <>
                            <h3 className="card-title" style={{ marginBottom: '24px' }}>Loan Details</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Loan Amount (₹) *</label>
                                    <input type="number" className={inp('loan_amount')} value={form.loan_amount}
                                        onChange={(e) => set('loan_amount', e.target.value)} placeholder="500000" min="1000" />
                                    {err('loan_amount')}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tenure (months) *</label>
                                    <input type="number" className={inp('loan_tenure_months')} value={form.loan_tenure_months}
                                        onChange={(e) => set('loan_tenure_months', e.target.value)} placeholder="24" min="1" max="360" />
                                    {err('loan_tenure_months')}
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Interest Rate (% p.a.) *</label>
                                    <input type="number" step="0.1" className={inp('interest_rate')} value={form.interest_rate}
                                        onChange={(e) => set('interest_rate', e.target.value)} placeholder="12.5" min="0.1" />
                                    {err('interest_rate')}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Loan Purpose</label>
                                    <select className="form-input" value={form.loan_purpose}
                                        onChange={(e) => set('loan_purpose', e.target.value)}>
                                        <option value="">Select Purpose</option>
                                        {LOAN_PURPOSES.map((p) => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {/* EMI Preview */}
                            {form.loan_amount && form.interest_rate && form.loan_tenure_months && (() => {
                                const P = parseFloat(form.loan_amount);
                                const r = parseFloat(form.interest_rate) / (12 * 100);
                                const n = parseInt(form.loan_tenure_months);
                                if (P > 0 && r > 0 && n > 0) {
                                    const emi = P * r * (1 + r) ** n / ((1 + r) ** n - 1);
                                    return (
                                        <div className="emi-preview">
                                            <span>Estimated EMI:</span>
                                            <strong>₹{Math.round(emi).toLocaleString('en-IN')}/month</strong>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </>
                    )}

                    {/* Navigation Buttons */}
                    <div className="form-actions" style={{ marginTop: '32px' }}>
                        <div>
                            {step > 1 && (
                                <button type="button" className="btn btn-outline" onClick={back}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.ArrowLeft /> Back</span>
                                </button>
                            )}
                            <button type="button" className="btn btn-outline" style={{ marginLeft: step > 1 ? '8px' : 0 }}
                                onClick={() => navigate('/applications')}>
                                Cancel
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {step === STEPS.length ? (
                                <>
                                    <button type="button" className="btn btn-outline" onClick={saveDraft} disabled={savingDraft || submitting}>
                                        {savingDraft ? 'Saving...' : 'Save as Draft'}
                                    </button>
                                    <button type="button" className="btn btn-primary" onClick={submitApplication} disabled={submitting || savingDraft}>
                                        {submitting ? 'Submitting...' : 'Submit Application'}
                                    </button>
                                </>
                            ) : (
                                <button type="button" className="btn btn-primary" onClick={next}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>Next <Icons.ChevronRight /></span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
