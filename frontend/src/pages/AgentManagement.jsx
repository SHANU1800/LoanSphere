import { useState, useEffect } from 'react';
import Topbar from '../components/Topbar';
import api from '../api/axios';
import * as Icons from '../components/Icons';

export default function AgentManagement() {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [toast, setToast] = useState(null);
    const [actionId, setActionId] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => { loadAgents(); }, []);

    const loadAgents = async () => {
        try {
            const res = await api.get('/auth/agents/');
            setAgents(res.data.results || res.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const approveAgent = async (userId) => {
        setActionId(userId + '-approve');
        try {
            await api.post(`/auth/agents/${userId}/approve/`);
            showToast('Agent approved!');
            loadAgents();
        } catch (err) { showToast(err.response?.data?.error || 'Error approving agent', 'error'); }
        finally { setActionId(null); }
    };

    const toggleActive = async (userId, isActive) => {
        setActionId(userId + '-toggle');
        try {
            await api.post(`/auth/users/${userId}/toggle-active/`);
            showToast(isActive ? 'Agent deactivated.' : 'Agent activated!');
            loadAgents();
        } catch (err) { showToast(err.response?.data?.error || 'Error', 'error'); }
        finally { setActionId(null); }
    };

    const filteredAgents = agents.filter((agent) => {
        const name = `${agent.user?.first_name} ${agent.user?.last_name} ${agent.user?.email} ${agent.agent_code}`.toLowerCase();
        const matchSearch = name.includes(search.toLowerCase());
        const matchStatus = filterStatus === 'all' ||
            (filterStatus === 'active' && agent.user?.is_approved && agent.user?.is_active) ||
            (filterStatus === 'pending' && !agent.user?.is_approved) ||
            (filterStatus === 'inactive' && !agent.user?.is_active);
        return matchSearch && matchStatus;
    });

    const summary = {
        total: agents.length,
        active: agents.filter((a) => a.user?.is_approved && a.user?.is_active).length,
        pending: agents.filter((a) => !a.user?.is_approved).length,
        totalApps: agents.reduce((acc, a) => acc + (a.total_applications || 0), 0),
    };

    return (
        <>
            <Topbar title="Agent Management" />
            <div className="page-content">
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                    {[
                        { label: 'Total Agents', value: summary.total, icon: <Icons.Users />, color: 'var(--primary-400)' },
                        { label: 'Active', value: summary.active, icon: <Icons.CheckCircle />, color: 'var(--success-500)' },
                        { label: 'Pending Approval', value: summary.pending, icon: <Icons.Clock />, color: 'var(--warning-500)' },
                        { label: 'Total Applications', value: summary.totalApps, icon: <Icons.ClipboardList />, color: 'var(--accent-500)' },
                    ].map((stat) => (
                        <div key={stat.label} className="stat-card">
                            <div className="stat-icon">{stat.icon}</div>
                            <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
                            <div className="stat-label">{stat.label}</div>
                        </div>
                    ))}
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icons.Users /> Field Agents</h3>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input
                                className="form-input"
                                style={{ width: '200px', marginBottom: 0 }}
                                placeholder="Search agents..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <select className="form-input" style={{ width: '160px', marginBottom: 0 }} value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}>
                                <option value="all">All Status</option>
                                <option value="active">Active</option>
                                <option value="pending">Pending</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                    {loading ? (
                        <div className="loading-spinner"><div className="spinner"></div></div>
                    ) : filteredAgents.length === 0 ? (
                        <div className="empty-state"><div className="empty-state-icon"><Icons.Users /></div><p>No agents found</p></div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Agent Code</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Region</th>
                                        <th>Apps / Approved</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAgents.map((agent) => (
                                        <tr key={agent.id}>
                                            <td style={{ fontWeight: 600, color: 'var(--primary-400)' }}>{agent.agent_code}</td>
                                            <td>{agent.user?.first_name} {agent.user?.last_name}</td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>{agent.user?.email}</td>
                                            <td>{agent.user?.phone || '—'}</td>
                                            <td>{agent.region || '—'}</td>
                                            <td>
                                                <span style={{ fontWeight: 600 }}>{agent.total_applications}</span>
                                                <span style={{ color: 'var(--text-muted)', marginLeft: '4px', fontSize: '0.8rem' }}>/ {agent.approved_applications}</span>
                                            </td>
                                            <td>
                                                {!agent.user?.is_approved ? (
                                                    <span className="badge badge-pending">Pending</span>
                                                ) : agent.user?.is_active ? (
                                                    <span className="badge badge-verified">Active</span>
                                                ) : (
                                                    <span className="badge badge-rejected">Inactive</span>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    {!agent.user?.is_approved && (
                                                        <button className="btn btn-success btn-sm"
                                                            disabled={actionId === agent.user?.id + '-approve'}
                                                            onClick={() => approveAgent(agent.user?.id)}>
                                                            {actionId === agent.user?.id + '-approve' ? '...' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icons.CheckCircle /> Approve</span>}
                                                        </button>
                                                    )}
                                                    {agent.user?.is_approved && (
                                                        <button
                                                            className={`btn btn-sm ${agent.user?.is_active ? 'btn-danger' : 'btn-success'}`}
                                                            style={{ borderColor: 'transparent' }}
                                                            disabled={actionId === agent.user?.id + '-toggle'}
                                                            onClick={() => toggleActive(agent.user?.id, agent.user?.is_active)}>
                                                            {actionId === agent.user?.id + '-toggle' ? '...' : agent.user?.is_active
                                                                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icons.XCircle /> Deactivate</span>
                                                                : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icons.CheckCircle /> Activate</span>
                                                            }
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

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
