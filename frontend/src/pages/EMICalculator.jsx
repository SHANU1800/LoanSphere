import { useState } from 'react';
import Topbar from '../components/Topbar';
import api from '../api/axios';
import * as Icons from '../components/Icons';

export default function EMICalculator() {
    const [amount, setAmount] = useState('500000');
    const [rate, setRate] = useState('12');
    const [tenure, setTenure] = useState('24');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const calculate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/loans/emi/calculate/', {
                loan_amount: parseFloat(amount),
                interest_rate: parseFloat(rate),
                tenure_months: parseInt(tenure),
            });
            setResult(res.data);
        } catch (err) {
            alert(err.response?.data?.error || 'Calculation error');
        } finally { setLoading(false); }
    };

    const formatCurrency = (val) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

    return (
        <>
            <Topbar title="EMI Calculator" />
            <div className="page-content">
                <div style={{ maxWidth: '700px' }}>
                    <div className="card">
                        <h3 className="card-title" style={{ marginBottom: '24px' }}>Calculate EMI</h3>
                        <form onSubmit={calculate}>
                            <div className="form-group">
                                <label className="form-label">Loan Amount (₹)</label>
                                <input type="number" className="form-input" value={amount} onChange={(e) => setAmount(e.target.value)} min="1000" required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Interest Rate (% per annum)</label>
                                    <input type="number" step="0.1" className="form-input" value={rate} onChange={(e) => setRate(e.target.value)} min="0.1" required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tenure (months)</label>
                                    <input type="number" className="form-input" value={tenure} onChange={(e) => setTenure(e.target.value)} min="1" max="360" required />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                                {loading ? 'Calculating...' : 'Calculate EMI'}
                            </button>
                        </form>
                    </div>

                    {result && (
                        <div className="emi-result" style={{ marginTop: '20px' }}>
                            <div className="emi-result-card">
                                <div className="emi-value">{formatCurrency(result.emi)}</div>
                                <div className="emi-label">Monthly EMI</div>
                            </div>
                            <div className="emi-result-card">
                                <div className="emi-value" style={{ color: 'var(--success-500)' }}>{formatCurrency(result.total_payable)}</div>
                                <div className="emi-label">Total Payable</div>
                            </div>
                            <div className="emi-result-card">
                                <div className="emi-value" style={{ color: 'var(--warning-500)' }}>{formatCurrency(result.total_interest)}</div>
                                <div className="emi-label">Total Interest</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
