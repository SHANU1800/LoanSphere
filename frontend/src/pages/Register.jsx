import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/rolePolicy';

const ROLE_OPTIONS = [
    { value: ROLES.ADMIN, label: 'Admin' },
    { value: ROLES.AGENT, label: 'Agent' },
    { value: ROLES.UNDERWRITER, label: 'Underwriter' },
    { value: ROLES.CREDIT_MANAGER, label: 'Credit Manager' },
    { value: ROLES.FINANCE, label: 'Finance' },
    { value: ROLES.OPERATIONS, label: 'Operations' },
    { value: ROLES.COMPLIANCE_OFFICER, label: 'Compliance Officer' },
    { value: ROLES.CUSTOMER, label: 'Customer' },
];

export default function Register() {
    const { user, register, loading } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        username: '',
        email: '',
        phone: '',
        role: ROLES.AGENT,
        password: '',
        confirm_password: '',
    });
    const [error, setError] = useState('');

    if (user) return <Navigate to="/" replace />;

    const updateField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (form.password !== form.confirm_password) {
            setError('Passwords do not match.');
            return;
        }
        const result = await register(form);
        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary)',
            padding: '32px 16px',
        }}>
            <div style={{ width: '100%', maxWidth: 520 }}>
                <div className="card" style={{ padding: 24 }}>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }}>Create account</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: 20 }}>
                        Register a new user and choose a role.
                    </p>

                    {error && <div className="login-error">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">First Name</label>
                                <input className="form-input" value={form.first_name} onChange={(e) => updateField('first_name', e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Last Name</label>
                                <input className="form-input" value={form.last_name} onChange={(e) => updateField('last_name', e.target.value)} required />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <input className="form-input" value={form.username} onChange={(e) => updateField('username', e.target.value)} required autoComplete="username" />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input type="email" className="form-input" value={form.email} onChange={(e) => updateField('email', e.target.value)} required autoComplete="email" />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input className="form-input" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="Optional" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Role</label>
                                <select className="form-input" value={form.role} onChange={(e) => updateField('role', e.target.value)}>
                                    {ROLE_OPTIONS.map((role) => (
                                        <option key={role.value} value={role.value}>{role.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input type="password" className="form-input" value={form.password} onChange={(e) => updateField('password', e.target.value)} minLength={8} required autoComplete="new-password" />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirm Password</label>
                            <input type="password" className="form-input" value={form.confirm_password} onChange={(e) => updateField('confirm_password', e.target.value)} minLength={8} required autoComplete="new-password" />
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 10 }} disabled={loading}>
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>

                    <p style={{ marginTop: 16, fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                        Already have an account? <Link to="/login">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}