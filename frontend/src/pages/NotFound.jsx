import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import * as Icons from '../components/Icons';

export default function NotFound() {
    const navigate = useNavigate();
    return (
        <>
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 24, position: 'relative', overflow: 'hidden' }}>
                {/* Background glow */}
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(99,102,241,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

                <div style={{ position: 'relative', textAlign: 'center', maxWidth: 480 }}>
                    {/* Big 404 */}
                    <div style={{ fontSize: '8rem', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1, background: 'linear-gradient(135deg, var(--primary-400), var(--primary-800))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>
                        404
                    </div>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#fb7185' }}>
                        <Icons.AlertTriangle />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10, letterSpacing: '-0.02em' }}>Page Not Found</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 28, lineHeight: 1.7 }}>
                        The page you're looking for doesn't exist or has been moved. Check the URL and try again.
                    </p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button className="btn btn-primary" onClick={() => navigate('/')}>
                            <Icons.Home /> Go to Dashboard
                        </button>
                        <button className="btn btn-outline" onClick={() => navigate(-1)}>
                            <Icons.ArrowLeft /> Go Back
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
