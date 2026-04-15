import { useState, useEffect } from 'react';
import Topbar from '../components/Topbar';
import api from '../api/axios';
import * as Icons from '../components/Icons';
import { useAuth } from '../context/AuthContext';

const TEMPLATE_TYPES = [
    'applicant_id', 'approved', 'rejected', 'doc_request',
    'emi_reminder', 'sanction_letter',
];
const CHANNELS = ['sms', 'email', 'whatsapp'];

const emptyTemplate = { name: '', template_type: 'applicant_id', channel: 'sms', subject: '', body_template: '', is_active: true };

export default function Notifications() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [templates, setTemplates] = useState([]);
    const [logs, setLogs] = useState([]);
    const [tab, setTab] = useState(isAdmin ? 'templates' : 'logs');
    const [loading, setLoading] = useState(true);
    const [editingTemplate, setEditingTemplate] = useState(null); // null or template object
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState(emptyTemplate);
    const [saving, setSaving] = useState(false);
    const [runningReminder, setRunningReminder] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        if (!isAdmin && tab === 'templates') {
            setTab('logs');
            return;
        }
        loadData();
    }, [tab, isAdmin]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (tab === 'templates') {
                if (!isAdmin) {
                    setTemplates([]);
                    return;
                }
                const res = await api.get('/notifications/templates/');
                setTemplates(res.data.results || res.data || []);
            } else {
                const res = await api.get('/notifications/logs/');
                setLogs(res.data.results || res.data || []);
            }
        } catch (err) {
            if (err.response?.status === 403 && tab === 'templates') {
                showToast('Only admins can manage notification templates.', 'error');
                setTab('logs');
                return;
            }
            console.error(err);
        }
        finally { setLoading(false); }
    };

    const openCreate = () => { setEditingTemplate(null); setFormData(emptyTemplate); setShowForm(true); };
    const openEdit = (t) => { setEditingTemplate(t); setFormData({ name: t.name, template_type: t.template_type, channel: t.channel, subject: t.subject || '', body_template: t.body_template, is_active: t.is_active }); setShowForm(true); };
    const closeForm = () => { setShowForm(false); setEditingTemplate(null); };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!isAdmin) {
            showToast('Only admins can manage notification templates.', 'error');
            return;
        }
        if (!formData.name.trim() || !formData.body_template.trim()) {
            showToast('Name and body are required', 'error'); return;
        }
        setSaving(true);
        try {
            if (editingTemplate) {
                await api.put(`/notifications/templates/${editingTemplate.id}/`, formData);
                showToast('Template updated!');
            } else {
                await api.post('/notifications/templates/', formData);
                showToast('Template created!');
            }
            closeForm();
            loadData();
        } catch (err) { showToast(err.response?.data?.error || 'Error saving template', 'error'); }
        finally { setSaving(false); }
    };

    const setF = (field, val) => setFormData((p) => ({ ...p, [field]: val }));

    const runEMIReminders = async () => {
        setRunningReminder(true);
        try {
            const res = await api.post('/notifications/emi-reminders/run/');
            showToast(`Reminder run complete: ${res.data.created_logs || 0} logs created.`);
            if (tab === 'logs') loadData();
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to run reminders', 'error');
        } finally {
            setRunningReminder(false);
        }
    };

    return (
        <>
            <Topbar title="Notifications" />
            <div className="page-content">
                <div className="filters-bar">
                    {isAdmin && (
                    <button className={`filter-chip ${tab === 'templates' ? 'active' : ''}`} onClick={() => setTab('templates')}>
                        Templates
                    </button>
                    )}
                    <button className={`filter-chip ${tab === 'logs' ? 'active' : ''}`} onClick={() => setTab('logs')}>
                        Delivery Logs
                    </button>
                    {isAdmin && tab === 'templates' && (
                        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={openCreate}>
                            + New Template
                        </button>
                    )}
                    {tab === 'logs' && (
                        <button
                            className="btn btn-primary btn-sm"
                            style={{ marginLeft: 'auto' }}
                            onClick={runEMIReminders}
                            disabled={runningReminder}
                        >
                            {runningReminder ? 'Running...' : 'Run EMI Reminder Scan'}
                        </button>
                    )}
                </div>

                <div className="card" style={{ marginTop: '12px' }}>
                    {loading ? (
                        <div className="loading-spinner"><div className="spinner"></div></div>
                    ) : tab === 'templates' ? (
                        <>
                            <div className="card-header">
                                <h3 className="card-title">Notification Templates</h3>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                    Variables: {'{{customer_name}}'}, {'{{loan_amount}}'}, {'{{applicant_id}}'}, {'{{status}}'}
                                </span>
                            </div>
                            {templates.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-state-icon"><Icons.FileText /></div>
                                    <p>No templates yet. Create one to get started.</p>
                                    <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={openCreate}>+ Create Template</button>
                                </div>
                            ) : (
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr><th>Name</th><th>Type</th><th>Channel</th><th>Subject</th><th>Status</th><th>Actions</th></tr>
                                        </thead>
                                        <tbody>
                                            {templates.map((t) => (
                                                <tr key={t.id}>
                                                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                                                    <td><span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.template_type?.replace(/_/g, ' ')}</span></td>
                                                    <td><span className="badge badge-submitted">{t.channel}</span></td>
                                                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject || '—'}</td>
                                                    <td><span className={`badge ${t.is_active ? 'badge-verified' : 'badge-pending'}`}>{t.is_active ? 'Active' : 'Inactive'}</span></td>
                                                    <td>
                                                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(t)}>Edit</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="card-header">
                                <h3 className="card-title">Delivery Logs</h3>
                            </div>
                            {logs.length === 0 ? (
                                <div className="empty-state"><div className="empty-state-icon"><Icons.ClipboardList /></div><p>No notifications sent yet</p></div>
                            ) : (
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr><th>Recipient</th><th>Channel</th><th>Subject</th><th>Status</th><th>Sent At</th></tr>
                                        </thead>
                                        <tbody>
                                            {logs.map((l) => (
                                                <tr key={l.id}>
                                                    <td>{l.recipient}</td>
                                                    <td><span className="badge badge-submitted">{l.channel}</span></td>
                                                    <td>{l.subject || '—'}</td>
                                                    <td><span className={`badge badge-${l.status}`}>{l.status}</span></td>
                                                    <td style={{ color: 'var(--text-muted)' }}>{l.sent_at ? new Date(l.sent_at).toLocaleString() : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Template Create/Edit Modal */}
                {showForm && (
                    <div className="modal-overlay" onClick={closeForm}>
                        <div className="modal" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
                            <h3 className="modal-title">{editingTemplate ? 'Edit Template' : 'New Template'}</h3>
                            <form onSubmit={handleSave}>
                                <div className="form-group">
                                    <label className="form-label">Template Name *</label>
                                    <input className="form-input" value={formData.name} required
                                        onChange={(e) => setF('name', e.target.value)} placeholder="e.g. Loan Approval SMS" />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Type</label>
                                        <select className="form-input" value={formData.template_type} onChange={(e) => setF('template_type', e.target.value)}>
                                            {TEMPLATE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Channel</label>
                                        <select className="form-input" value={formData.channel} onChange={(e) => setF('channel', e.target.value)}>
                                            {CHANNELS.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                </div>
                                {(formData.channel === 'email') && (
                                    <div className="form-group">
                                        <label className="form-label">Email Subject</label>
                                        <input className="form-input" value={formData.subject}
                                            onChange={(e) => setF('subject', e.target.value)} placeholder="e.g. Your loan has been approved" />
                                    </div>
                                )}
                                <div className="form-group">
                                    <label className="form-label">Message Body *</label>
                                    <textarea className="form-textarea" value={formData.body_template} required rows={5}
                                        onChange={(e) => setF('body_template', e.target.value)}
                                        placeholder="Dear {{customer_name}}, your loan {{applicant_id}} for ₹{{loan_amount}} has been {{status}}." />
                                    <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                        Available variables: {'{{customer_name}}'}, {'{{applicant_id}}'}, {'{{loan_amount}}'}, {'{{status}}'}, {'{{emi}}'}
                                    </small>
                                </div>
                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input type="checkbox" id="is_active" checked={formData.is_active}
                                        onChange={(e) => setF('is_active', e.target.checked)} />
                                    <label htmlFor="is_active" className="form-label" style={{ margin: 0 }}>Active (will trigger automatically)</label>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn btn-outline" onClick={closeForm}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                        {saving ? 'Saving...' : (editingTemplate ? 'Update Template' : 'Create Template')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Toast */}
                {toast && (
                    <div className="toast-container">
                        <div className={`toast ${toast.type}`}>
                            {toast.type === 'success' ? <Icons.Check /> : <Icons.X />} {toast.msg}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
