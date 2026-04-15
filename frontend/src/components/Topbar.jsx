import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GlobalSearch from './GlobalSearch';
import api from '../api/axios';
import * as Icons from './Icons';

export default function Topbar({ title }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showSearch, setShowSearch] = useState(false);
    const [showNotifs, setShowNotifs] = useState(false);
    const [notifs, setNotifs] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const notifRef = useRef(null);

    const handleLogout = () => { logout(); navigate('/login'); };

    const initials = user
        ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'
        : '??';

    const today = new Date().toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });

    // Load notifications
    useEffect(() => {
        loadNotifs();
        const interval = setInterval(loadNotifs, 30000); // poll every 30s
        return () => clearInterval(interval);
    }, []);

    const loadNotifs = async () => {
        try {
            const res = await api.get('/notifications/', { params: { page_size: 8 } });
            const data = res.data.results || res.data || [];
            const mapped = data.map((n) => ({
                ...n,
                title: n.title || n.subject || 'Notification',
                message: n.message || n.body || '',
                is_read: !!n.is_read,
                loan_application: n.loan_application || n.application,
            }));
            setNotifs(mapped);
            setUnreadCount(mapped.filter(n => !n.is_read).length);
        } catch { /* silent fail */ }
    };

    const markAllRead = async () => {
        try {
            await api.post('/notifications/mark-all-read/');
            await loadNotifs();
        } catch { /* silent fail */ }
    };

    // Keyboard shortcut Ctrl+K / Cmd+K
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setShowSearch(s => !s);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // Close notification dropdown on outside click
    useEffect(() => {
        const handle = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false); };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    return (
        <>
            <header className="topbar">
                <div className="topbar-left">
                    <h1 className="page-title">{title}</h1>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderLeft: '1px solid var(--border-color)', paddingLeft: 14, marginLeft: 4 }}>
                        {today}
                    </span>
                </div>
                <div className="topbar-right">
                    {/* Global Search trigger */}
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setShowSearch(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', color: 'var(--text-muted)' }}
                        title="Search (Ctrl+K)"
                    >
                        <Icons.Search />
                        <span style={{ fontSize: '0.78rem' }}>Search...</span>
                        <kbd style={{ fontSize: '0.65rem', padding: '1px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: 4, border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Ctrl+K</kbd>
                    </button>

                    {/* Notification Bell */}
                    <div style={{ position: 'relative' }} ref={notifRef}>
                        <button
                            onClick={() => { setShowNotifs(s => !s); if (!showNotifs) loadNotifs(); }}
                            style={{ position: 'relative', background: 'none', border: '1px solid var(--border-color)', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                            <Icons.Bell />
                            {unreadCount > 0 && (
                                <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, background: 'var(--danger-500)', borderRadius: '50%', fontSize: '0.6rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {showNotifs && (
                            <div className="notif-dropdown">
                                <div className="notif-dropdown-header">
                                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Notifications</span>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        {unreadCount > 0 && (
                                            <button onClick={markAllRead} style={{ background: 'none', border: 'none', fontSize: '0.74rem', color: 'var(--primary-400)', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                                                Mark all read
                                            </button>
                                        )}
                                        <button onClick={() => { navigate('/notifications'); setShowNotifs(false); }} style={{ background: 'none', border: 'none', fontSize: '0.74rem', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>View all <Icons.ChevronRight /></span>
                                        </button>
                                    </div>
                                </div>
                                <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                                    {notifs.length === 0 ? (
                                        <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.Sparkles /> You're all caught up!</div>
                                        </div>
                                    ) : notifs.map((n) => (
                                        <div key={n.id} className="notif-item" style={{ background: !n.is_read ? 'rgba(99,102,241,0.04)' : 'transparent' }}
                                            onClick={() => { setShowNotifs(false); if (n.loan_application) navigate(`/applications/${n.loan_application}`); }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: !n.is_read ? 'var(--primary-500)' : 'transparent', flexShrink: 0, marginTop: 6 }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: !n.is_read ? 600 : 400, fontSize: '0.83rem', color: 'var(--text-primary)', marginBottom: 2, lineHeight: 1.4 }}>{n.title || n.message}</div>
                                                    {n.title && n.message && <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</div>}
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User info */}
                    <div className="user-info" style={{ cursor: 'pointer' }} onClick={() => navigate('/settings')}>
                        <div className="user-avatar">{initials}</div>
                        <div>
                            <div className="user-name">{user?.first_name} {user?.last_name}</div>
                            <div className="user-role">{user?.role}</div>
                        </div>
                    </div>
                    <button className="btn-logout" onClick={handleLogout}>Logout</button>
                </div>
            </header>

            {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}
        </>
    );
}
