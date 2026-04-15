import React from 'react';
import * as Icons from './Icons';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error('Error caught by boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 24, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(244,63,94,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <div style={{ position: 'relative', textAlign: 'center', maxWidth: 640 }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#fb7185' }}>
                            <Icons.AlertTriangle />
                        </div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>Something went wrong</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 28, lineHeight: 1.7 }}>
                            An unexpected error occurred in the application. Please try refreshing the page or contact support if the issue persists.
                        </p>
                        
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 16, textAlign: 'left', marginBottom: 24, overflowX: 'auto' }}>
                                <div style={{ color: '#fb7185', fontWeight: 600, fontSize: '0.85rem', marginBottom: 8, fontFamily: 'monospace' }}>
                                    {this.state.error.toString()}
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                    {this.state.errorInfo?.componentStack}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="btn btn-primary" onClick={() => window.location.reload()}>
                                <Icons.RefreshCw /> Refresh Page
                            </button>
                            <button className="btn btn-outline" onClick={() => window.location.href = '/'}>
                                <Icons.Home /> Go to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
