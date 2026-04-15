import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import * as Icons from '../components/Icons';

const FEATURES = [
    { icon: <Icons.Zap />, text: 'Real-time loan pipeline tracking' },
    { icon: <Icons.Lock />, text: 'Role-based access control & audit logs' },
    { icon: <Icons.BarChart />, text: 'Analytics, reports & KYC verification' },
    { icon: <Icons.CreditCard />, text: 'Automated fee reconciliation' },
];

const QUICK_ROLE_LOGINS = [
    { role: 'Admin', email: 'admin@loanplatform.com', password: 'admin123' },
    { role: 'Agent', email: 'agent@loanplatform.com', password: 'admin123' },
    { role: 'Underwriter', email: 'underwriter@loanplatform.com', password: 'admin123' },
    { role: 'Credit Manager', email: 'creditmanager@loanplatform.com', password: 'admin123' },
    { role: 'Finance', email: 'finance@loanplatform.com', password: 'admin123' },
    { role: 'Operations', email: 'operations@loanplatform.com', password: 'admin123' },
    { role: 'Compliance Officer', email: 'compliance@loanplatform.com', password: 'admin123' },
    { role: 'Customer', email: 'customer@loanplatform.com', password: 'admin123' },
];

export default function Login() {
    const { user, login, loading } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    if (user) return <Navigate to="/" replace />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const result = await login(email, password);
        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
        }
    };

    const fillDemo = (demoEmail = 'admin@loanplatform.com', demoPassword = 'admin123') => {
        setEmail(demoEmail);
        setPassword(demoPassword);
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            background: 'var(--bg-primary)',
        }}>
            {/* ── Left brand panel ── */}
            <div style={{
                flex: '0 0 45%',
                background: 'linear-gradient(145deg, #0d1120 0%, #0a0d1a 50%, #06080f 100%)',
                borderRight: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '60px 56px',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* ambient glow */}
                <div style={{
                    position: 'absolute', top: '-20%', left: '-10%',
                    width: '500px', height: '500px',
                    background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', bottom: '-15%', right: '-10%',
                    width: '400px', height: '400px',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 52, position: 'relative' }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '1.2rem', color: '#fff',
                        boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
                    }}>LS</div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>LoanSphere</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Admin Portal</div>
                    </div>
                </div>

                {/* Headline */}
                <h1 style={{
                    fontSize: '2.4rem', fontWeight: 800, lineHeight: 1.15,
                    color: 'var(--text-primary)', marginBottom: 16, position: 'relative',
                }}>
                    Streamline your<br />
                    <span style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        loan operations
                    </span>
                </h1>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: 48, lineHeight: 1.7, position: 'relative' }}>
                    End-to-end LoanSphere platform for modern financial institutions.
                </p>

                {/* Feature list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
                    {FEATURES.map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 8,
                                background: 'rgba(99,102,241,0.12)',
                                border: '1px solid rgba(99,102,241,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1rem', flexShrink: 0,
                            }}>{f.icon}</div>
                            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{f.text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Right form panel ── */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 48px',
            }}>
                <div style={{ width: '100%', maxWidth: 400 }}>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 6 }}>Welcome back</h2>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 32 }}>
                        Sign in to your admin account
                    </p>

                    {error && <div className="login-error">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                id="login-email"
                                type="email"
                                className="form-input"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="form-input"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    style={{ paddingRight: 44 }}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(s => !s)}
                                    style={{
                                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1,
                                    }}
                                    aria-label="Toggle password"
                                >{showPassword ? <Icons.EyeOff /> : <Icons.Eye />}</button>
                            </div>
                        </div>

                        <button
                            id="login-submit"
                            type="submit"
                            className="btn btn-primary login-btn"
                            disabled={loading}
                            style={{ width: '100%', padding: '12px', fontSize: '0.95rem', marginTop: 8 }}
                        >
                            {loading ? 'Signing in...' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>Sign In <Icons.ChevronRight /></span>}
                        </button>
                    </form>

                    <p style={{ marginTop: 14, fontSize: '0.88rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                        No account yet? <Link to="/register">Register here</Link>
                    </p>

                    {/* Demo credentials */}
                    <div
                        onClick={() => fillDemo()}
                        style={{
                            marginTop: 24, padding: '12px 16px',
                            background: 'rgba(99,102,241,0.08)',
                            border: '1px solid rgba(99,102,241,0.2)',
                            borderRadius: 8, cursor: 'pointer',
                            transition: 'background 0.15s',
                        }}
                        title="Click to fill demo credentials"
                    >
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6366f1', marginBottom: 8 }}>
                            QUICK LOGIN CREDENTIALS — click a role
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {QUICK_ROLE_LOGINS.map((demo) => (
                                <button
                                    key={demo.role}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fillDemo(demo.email, demo.password);
                                    }}
                                    style={{
                                        textAlign: 'left',
                                        border: '1px solid rgba(99,102,241,0.24)',
                                        borderRadius: 8,
                                        padding: '8px 10px',
                                        background: 'rgba(99,102,241,0.06)',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontSize: '0.78rem',
                                    }}
                                    title={`${demo.email} / ${demo.password}`}
                                >
                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{demo.role}</div>
                                    <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{demo.email}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
