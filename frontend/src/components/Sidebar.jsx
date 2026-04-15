import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as Icons from './Icons';
import { ROUTE_ROLES, hasRoleAccess } from '../constants/rolePolicy';

const navItems = [
    {
        section: 'Main', items: [
            { to: '/', icon: <Icons.Dashboard />, label: 'Dashboard', allowedRoles: ROUTE_ROLES.dashboard },
            { to: '/applications', icon: <Icons.ClipboardList />, label: 'Applications', allowedRoles: ROUTE_ROLES.applications },
        ]
    },
    {
        section: 'Processing', items: [
            { to: '/underwriting', icon: <Icons.Search />, label: 'Underwriting', allowedRoles: ROUTE_ROLES.underwriting },
            { to: '/disbursal', icon: <Icons.Package />, label: 'Disbursal Queue', allowedRoles: ROUTE_ROLES.disbursal },
            { to: '/fees', icon: <Icons.Wallet />, label: 'Fee Reconciliation', allowedRoles: ROUTE_ROLES.fees },
        ]
    },
    {
        section: 'Tools & Utilities', items: [
            { to: '/applications/new', icon: <Icons.Plus />, label: 'New Application', allowedRoles: ROUTE_ROLES.applicationsNew },
            { to: '/emi-calculator', icon: <Icons.Calculator />, label: 'EMI Calculator', allowedRoles: ROUTE_ROLES.emiCalculator },
            { to: '/notifications', icon: <Icons.Bell />, label: 'Notifications', allowedRoles: ROUTE_ROLES.notifications },
            { to: '/agents', icon: <Icons.Users />, label: 'Agent Management', allowedRoles: ROUTE_ROLES.agents },
        ]
    },
    {
        section: 'System', items: [
            { to: '/reports', icon: <Icons.BarChart />, label: 'Reports', allowedRoles: ROUTE_ROLES.reports },
            { to: '/audit', icon: <Icons.Shield />, label: 'Audit Logs', allowedRoles: ROUTE_ROLES.audit },
            { to: '/settings', icon: <Icons.Settings />, label: 'Settings', allowedRoles: ROUTE_ROLES.settings },
        ]
    },
];

export default function Sidebar() {
    const { user, logout } = useAuth();
    const [collapsed, setCollapsed] = useState(false);
    const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('').toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U';
    const filteredSections = navItems
        .map((section) => ({
            ...section,
            items: section.items.filter((item) => hasRoleAccess(user?.role, item.allowedRoles)),
        }))
        .filter((section) => section.items.length > 0);

    return (
        <>
            {/* Mobile overlay */}
            {!collapsed && (
                <div
                    className="sidebar-mobile-overlay"
                    onClick={() => setCollapsed(true)}
                />
            )}

            <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">LS</div>
                    {!collapsed && (
                        <div style={{ flex: 1 }}>
                            <div className="sidebar-title">LoanSphere</div>
                            <div className="sidebar-subtitle">Admin Portal</div>
                        </div>
                    )}
                    <button
                        onClick={() => setCollapsed(c => !c)}
                        className="sidebar-toggle-btn"
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        <Icons.ChevronRight />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {filteredSections.map((section) => (
                        <div key={section.section}>
                            {!collapsed && <div className="nav-section-label">{section.section}</div>}
                            {section.items.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.to === '/'}
                                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                    title={collapsed ? item.label : undefined}
                                >
                                    <span className="nav-icon">{item.icon}</span>
                                    {!collapsed && item.label}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer" style={{ padding: collapsed ? '12px 8px' : '16px', borderTop: '1px solid var(--border-color)', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-500)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.85rem', fontWeight: 700, color: '#fff', flexShrink: 0
                    }}>{initials}</div>
                    {!collapsed && <>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role || 'Staff'}</div>
                        </div>
                        <button
                            onClick={logout}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem', padding: '4px', flexShrink: 0, transition: 'color 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#fb7185'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                            title="Logout"
                        ><Icons.LogOut /></button>
                    </>}
                </div>
            </aside>
        </>
    );
}
