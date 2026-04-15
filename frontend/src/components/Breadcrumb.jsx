import { Link, useLocation } from 'react-router-dom';
import * as Icons from './Icons';

// Map of path segments to human-readable labels
const LABELS = {
    '':              { label: 'Dashboard', icon: <Icons.Home /> },
    'applications':  { label: 'Applications', icon: <Icons.ClipboardList /> },
    'new':           { label: 'New Application' },
    'underwriting':  { label: 'Underwriting', icon: <Icons.Search /> },
    'fees':          { label: 'Fee Reconciliation', icon: <Icons.Wallet /> },
    'emi-calculator':{ label: 'EMI Calculator', icon: <Icons.Calculator /> },
    'agents':        { label: 'Agent Management', icon: <Icons.Users /> },
    'notifications': { label: 'Notifications', icon: <Icons.Bell /> },
    'reports':       { label: 'Reports', icon: <Icons.BarChart /> },
    'audit':         { label: 'Audit Logs', icon: <Icons.Shield /> },
    'settings':      { label: 'Settings', icon: <Icons.Settings /> },
    'disbursal':     { label: 'Disbursal Queue', icon: <Icons.Package /> },
};

export default function Breadcrumb() {
    const location = useLocation();
    const segments = location.pathname.split('/').filter(Boolean);

    if (segments.length === 0) return null; // don't show on dashboard root (already in page title)

    const crumbs = [
        { path: '/', label: 'Dashboard', icon: <Icons.Home /> },
        ...segments.map((seg, i) => {
            const path = '/' + segments.slice(0, i + 1).join('/');
            const meta = LABELS[seg];
            const label = meta?.label || (seg.startsWith('APP-') ? seg : seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
            return { path, label, icon: meta?.icon || null };
        }),
    ];

    return (
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 16, flexWrap: 'wrap' }}>
            {crumbs.map((crumb, i) => {
                const isLast = i === crumbs.length - 1;
                return (
                    <span key={crumb.path} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {i > 0 && <span style={{ opacity: 0.4, display: 'flex' }}><Icons.ChevronRight /></span>}
                        {isLast ? (
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                {crumb.icon && <span style={{ opacity: 0.7 }}>{crumb.icon}</span>}
                                {crumb.label}
                            </span>
                        ) : (
                            <Link to={crumb.path} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                                {crumb.icon && <span style={{ opacity: 0.7 }}>{crumb.icon}</span>}
                                {crumb.label}
                            </Link>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}
