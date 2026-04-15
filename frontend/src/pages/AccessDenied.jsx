import { useNavigate } from 'react-router-dom';
import * as Icons from '../components/Icons';

export default function AccessDenied() {
    const navigate = useNavigate();
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 24 }}>
            <div className="card" style={{ maxWidth: 520, textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.12)', color: 'var(--danger-500)' }}>
                    <Icons.Shield />
                </div>
                <h2 style={{ marginBottom: 8 }}>Access Denied</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: 18 }}>
                    You don’t have permission to access this module with your current role.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" onClick={() => navigate('/')}>Go to Dashboard</button>
                    <button className="btn btn-outline" onClick={() => navigate(-1)}>Go Back</button>
                </div>
            </div>
        </div>
    );
}
