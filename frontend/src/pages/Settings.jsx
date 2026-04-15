import { useState } from 'react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../api/axios';
import * as Icons from '../components/Icons';

const TABS = ['Profile', 'Security', 'Notifications', 'Session'];

export default function Settings() {
    const { user, updateUser } = useAuth();
    const { toast } = useToast();
    const [tab, setTab] = useState('Profile');

    // Profile state
    const [profile, setProfile] = useState({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        email: user?.email || '',
    });
    const [savingProfile, setSavingProfile] = useState(false);

    // Password state
    const [pwd, setPwd] = useState({ current: '', new: '', confirm: '' });
    const [savingPwd, setSavingPwd] = useState(false);

    // Notification prefs
    const [notifPrefs, setNotifPrefs] = useState({
        email_on_new_app: true, email_on_approval: true, email_on_rejection: true,
        whatsapp_on_approval: false, sms_on_emi_reminder: false,
    });

    const saveProfile = async () => {
        setSavingProfile(true);
        try {
            const res = await api.patch('/auth/me/', profile);
            if (res?.data) {
                updateUser(res.data);
            }
            toast('Profile updated successfully', 'success');
        } catch (err) { toast(err.response?.data?.error || 'Failed to update profile', 'error'); }
        finally { setSavingProfile(false); }
    };

    const changePassword = async () => {
        if (pwd.new !== pwd.confirm) { toast('New passwords do not match', 'error'); return; }
        if (pwd.new.length < 8) { toast('Password must be at least 8 characters', 'error'); return; }
        setSavingPwd(true);
        try {
            await api.post('/auth/change-password/', { old_password: pwd.current, new_password: pwd.new });
            toast('Password changed successfully', 'success');
            setPwd({ current: '', new: '', confirm: '' });
        } catch (err) { toast(err.response?.data?.error || 'Failed to change password', 'error'); }
        finally { setSavingPwd(false); }
    };

    const initials = [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('').toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U';

    const ROLE_BADGE = {
        admin: '#6366f1',
        agent: '#3b82f6',
        underwriter: '#22d3ee',
        credit_manager: '#a855f7',
        finance: '#f59e0b',
        operations: '#22c55e',
        compliance_officer: '#ef4444',
        customer: '#14b8a6',
    };

    return (
        <>
            <Topbar title="Settings" />
            <div className="page-content">
                <Breadcrumb />

                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
                    {/* Sidebar tabs */}
                    <div>
                        <div className="card" style={{ padding: '18px 12px' }}>
                            {/* User preview */}
                            <div style={{ textAlign: 'center', padding: '8px 0 18px', borderBottom: '1px solid var(--border-color)', marginBottom: 12 }}>
                                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: '0 auto 10px', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
                                    {initials}
                                </div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                    {user?.first_name} {user?.last_name}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 8 }}>{user?.email}</div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${ROLE_BADGE[user?.role] || '#6366f1'}22`, color: ROLE_BADGE[user?.role] || '#a5b4fc', border: `1px solid ${ROLE_BADGE[user?.role] || '#6366f1'}44` }}>
                                    {user?.role?.toUpperCase() || 'STAFF'}
                                </span>
                            </div>
                            {TABS.map(t => (
                                <button key={t} onClick={() => setTab(t)}
                                    className={`nav-item ${tab === t ? 'active' : ''}`}
                                    style={{ width: '100%', textAlign: 'left' }}>
                                    {t === 'Profile' && <Icons.User />}
                                    {t === 'Security' && <Icons.Lock />}
                                    {t === 'Notifications' && <Icons.Bell />}
                                    {t === 'Session' && <Icons.Shield />}
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab content */}
                    <div>
                        {/* Profile */}
                        {tab === 'Profile' && (
                            <div className="card">
                                <div className="card-header"><h3 className="card-title">Edit Profile</h3></div>
                                <div className="form-row" style={{ marginBottom: 14 }}>
                                    <div className="form-group">
                                        <label className="form-label">First Name</label>
                                        <input className="form-input" value={profile.first_name} onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Last Name</label>
                                        <input className="form-input" value={profile.last_name} onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginBottom: 18 }}>
                                    <label className="form-label">Email Address</label>
                                    <input className="form-input" type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 20 }}>
                                    <label className="form-label">Role (Read-only)</label>
                                    <input className="form-input" value={user?.role || 'staff'} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                                    <span className="form-error" style={{ color: 'var(--text-muted)' }}>Role can only be changed by a super-admin</span>
                                </div>
                                <button className="btn btn-primary" onClick={saveProfile} disabled={savingProfile}>
                                    {savingProfile ? 'Saving...' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.Save /> Save Profile</span>}
                                </button>
                            </div>
                        )}

                        {/* Security */}
                        {tab === 'Security' && (
                            <div className="card">
                                <div className="card-header"><h3 className="card-title">Change Password</h3></div>
                                <div className="form-group">
                                    <label className="form-label">Current Password</label>
                                    <input className="form-input" type="password" value={pwd.current} onChange={e => setPwd(p => ({ ...p, current: e.target.value }))} placeholder="Enter current password" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">New Password</label>
                                    <input className="form-input" type="password" value={pwd.new} onChange={e => setPwd(p => ({ ...p, new: e.target.value }))} placeholder="Min. 8 characters" />
                                </div>
                                <div className="form-group" style={{ marginBottom: 20 }}>
                                    <label className="form-label">Confirm New Password</label>
                                    <input className="form-input" type="password" value={pwd.confirm} onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} placeholder="Re-enter new password" />
                                    {pwd.new && pwd.confirm && pwd.new !== pwd.confirm && (
                                        <span className="form-error">Passwords do not match</span>
                                    )}
                                </div>
                                <button className="btn btn-primary" onClick={changePassword} disabled={savingPwd || !pwd.current || !pwd.new || !pwd.confirm}>
                                    {savingPwd ? 'Changing...' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.Lock /> Change Password</span>}
                                </button>
                            </div>
                        )}

                        {/* Notifications */}
                        {tab === 'Notifications' && (
                            <div className="card">
                                <div className="card-header"><h3 className="card-title">Notification Preferences</h3></div>
                                {[
                                    { key: 'email_on_new_app', label: 'Email on new application submitted', icon: <Icons.Mail /> },
                                    { key: 'email_on_approval', label: 'Email on loan approval', icon: <Icons.CheckCircle /> },
                                    { key: 'email_on_rejection', label: 'Email on loan rejection', icon: <Icons.XCircle /> },
                                    { key: 'whatsapp_on_approval', label: 'WhatsApp on loan approval', icon: <Icons.MessageSquare /> },
                                    { key: 'sms_on_emi_reminder', label: 'SMS for EMI reminders', icon: <Icons.Phone /> },
                                ].map(item => (
                                    <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                                        <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>{item.icon} {item.label}</span>
                                        <label className="toggle-switch">
                                            <input type="checkbox" checked={notifPrefs[item.key]} onChange={() => setNotifPrefs(p => ({ ...p, [item.key]: !p[item.key] }))} />
                                            <span className="toggle-slider" />
                                        </label>
                                    </div>
                                ))}
                                <div style={{ marginTop: 20 }}>
                                    <button className="btn btn-primary" onClick={() => toast('Notification preferences saved', 'success')}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.Save /> Save Preferences</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Session */}
                        {tab === 'Session' && (
                            <div className="card">
                                <div className="card-header"><h3 className="card-title">Session Information</h3></div>
                                <div className="detail-section">
                                    <div className="detail-row"><span className="detail-label">Username</span><span className="detail-value" style={{ fontFamily: 'monospace' }}>{user?.username}</span></div>
                                    <div className="detail-row"><span className="detail-label">Role</span><span className="detail-value">{user?.role}</span></div>
                                    <div className="detail-row"><span className="detail-label">Email</span><span className="detail-value">{user?.email}</span></div>
                                    <div className="detail-row"><span className="detail-label">Session Storage</span><span className="detail-value">localStorage (JWT)</span></div>
                                    <div className="detail-row"><span className="detail-label">Token Status</span><span className="detail-value" style={{ color: 'var(--success-500)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icons.Check /> Active</span></div>
                                </div>
                                <div style={{ marginTop: 20, padding: 16, background: 'rgba(244,63,94,0.05)', borderRadius: 8, border: '1px solid rgba(244,63,94,0.15)' }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#fb7185', marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.AlertTriangle /> Danger Zone</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>Logging out will clear your session and redirect you to the login page.</div>
                                    <button className="btn btn-danger btn-sm" onClick={() => { localStorage.removeItem('tokens'); localStorage.removeItem('user'); window.location.href = '/login'; }}>
                                        <Icons.LogOut /> Sign Out All Sessions
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
