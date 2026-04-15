import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { SkeletonStatCard, SkeletonCard } from '../components/Skeleton';
import api from '../api/axios';
import * as Icons from '../components/Icons';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#f43f5e', '#22d3ee', '#c4b5fd'];

const CustomTooltip = ({ active, payload, label, currency }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-hover)', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', boxShadow: 'var(--shadow-md)' }}>
            {label && <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontSize: '0.75rem' }}>{label}</div>}
            {payload.map((p, i) => (
                <div key={i} style={{ color: p.color || 'var(--text-primary)', fontWeight: 600 }}>
                    {p.name}: {currency ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p.value) : p.value}
                </div>
            ))}
        </div>
    );
};

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [recentApps, setRecentApps] = useState([]);
    const [trendData, setTrendData] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [statsRes, appsRes] = await Promise.all([
                api.get('/reports/dashboard/'),
                api.get('/loans/?page_size=5'),
            ]);
            setStats(statsRes.data);
            setRecentApps(appsRes.data.results || []);
            // Build trend from status breakdown
            const sb = statsRes.data?.status_breakdown || {};
            setTrendData(Object.entries(sb).map(([k, v]) => ({ name: k.replace(/_/g, ' '), value: v })).filter(x => x.value > 0));
        } catch (err) {
            console.error('Dashboard load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

    const sb = stats?.status_breakdown || {};
    const totalApps = stats?.total_applications || 0;
    const approvedCount = sb.approved || 0;
    const approvalRate = totalApps > 0 ? Math.round((approvedCount / totalApps) * 100) : 0;
    const circumference = 2 * Math.PI * 36;
    const dashOffset = circumference - (approvalRate / 100) * circumference;

    if (loading) return (
        <>
            <Topbar title="Dashboard" />
            <div className="page-content">
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                    {[...Array(5)].map((_, i) => <SkeletonStatCard key={i} />)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                    <SkeletonCard rows={6} />
                    <SkeletonCard rows={6} />
                </div>
                <SkeletonCard rows={8} />
            </div>
        </>
    );

    return (
        <>
            <Topbar title="Dashboard" />
            <div className="page-content">
                <Breadcrumb />

                {/* Quick Actions */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/applications/new')}>
                        <Icons.Plus /> New Application
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/underwriting')}>
                        <Icons.Search /> Review Pending ({stats?.pending_review || 0})
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/fees')}>
                        <Icons.Wallet /> Reconcile Fees
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => navigate('/disbursal')}>
                        <Icons.Package /> Disbursal Queue ({stats?.disbursal_queue || 0})
                    </button>
                </div>

                {/* Stat Cards */}
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                    <div className="stat-card primary">
                        <div className="stat-icon"><Icons.ClipboardList /></div>
                        <div className="stat-value">{stats?.total_applications || 0}</div>
                        <div className="stat-label">Total Applications</div>
                    </div>
                    <div className="stat-card warning">
                        <div className="stat-icon"><Icons.Clock /></div>
                        <div className="stat-value">{stats?.pending_review || 0}</div>
                        <div className="stat-label">Pending Review</div>
                    </div>
                    <div className="stat-card" style={{ background: 'linear-gradient(135deg, var(--primary-600), var(--primary-800))' }}>
                        <div className="stat-icon"><Icons.Send /></div>
                        <div className="stat-value">{stats?.disbursal_queue || 0}</div>
                        <div className="stat-label">Disbursal Queue</div>
                    </div>
                    <div className="stat-card success">
                        <div className="stat-icon"><Icons.CheckCircle /></div>
                        <div className="stat-value">{sb.approved || 0}</div>
                        <div className="stat-label">Approved</div>
                    </div>
                    <div className="stat-card danger">
                        <div className="stat-icon"><Icons.XCircle /></div>
                        <div className="stat-value">{sb.rejected || 0}</div>
                        <div className="stat-label">Rejected</div>
                    </div>
                </div>

                {/* Charts Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 280px', gap: 20, marginBottom: 20 }}>

                    {/* Pipeline Bar Chart */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Application Pipeline</h3>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>By Status</span>
                        </div>
                        {trendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={trendData} barCategoryGap="30%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {trendData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="empty-state" style={{ padding: '40px 0' }}><p>No data yet</p></div>
                        )}
                    </div>

                    {/* Financial Summary */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Financial Summary</h3>
                        </div>
                        <div className="detail-section" style={{ marginBottom: 0 }}>
                            <div className="detail-row">
                                <span className="detail-label">Total Approved Amount</span>
                                <span className="detail-value" style={{ color: 'var(--success-500)' }}>{formatCurrency(stats?.total_approved_amount)}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Average Loan Amount</span>
                                <span className="detail-value">{formatCurrency(stats?.average_loan_amount)}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Total Fees Collected</span>
                                <span className="detail-value">{formatCurrency(stats?.total_fees_collected)}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Pending Fees</span>
                                <span className="detail-value" style={{ color: 'var(--warning-500)' }}>{formatCurrency(stats?.pending_fees)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Approval Rate Ring */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                        <div className="card-title" style={{ alignSelf: 'flex-start' }}>Approval Rate</div>
                        <svg width="100" height="100" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                            <circle
                                cx="50" cy="50" r="36" fill="none"
                                stroke="var(--success-500)" strokeWidth="10"
                                strokeDasharray={circumference} strokeDashoffset={dashOffset}
                                strokeLinecap="round"
                                transform="rotate(-90 50 50)"
                                style={{ transition: 'stroke-dashoffset 1s ease' }}
                            />
                            <text x="50" y="54" textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--text-primary)">{approvalRate}%</text>
                        </svg>
                        <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {approvedCount} of {totalApps} approved
                        </div>
                        {/* Donut breakdown */}
                        {trendData.length > 0 && (
                            <ResponsiveContainer width="100%" height={100}>
                                <PieChart>
                                    <Pie data={trendData} cx="50%" cy="50%" innerRadius={28} outerRadius={44} dataKey="value" paddingAngle={2}>
                                        {trendData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Recent Applications */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Recent Applications</h3>
                        <button className="btn btn-outline btn-sm" onClick={() => navigate('/applications')}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>View All <Icons.ChevronRight /></span>
                        </button>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Applicant ID</th>
                                    <th>Customer</th>
                                    <th>Phone</th>
                                    <th>Loan Amount</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentApps.length === 0 ? (
                                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                                        <div style={{ color: 'var(--text-muted)' }}>
                                            <div style={{ fontSize: '1.8rem', marginBottom: 8, opacity: 0.3 }}><Icons.ClipboardList /></div>
                                            No applications yet
                                        </div>
                                    </td></tr>
                                ) : (
                                    recentApps.map((app) => (
                                        <tr key={app.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/applications/${app.id}`)}>
                                            <td style={{ fontWeight: 600, color: 'var(--primary-400)' }}>{app.applicant_id}</td>
                                            <td>{app.customer_full_name}</td>
                                            <td>{app.customer_phone}</td>
                                            <td style={{ fontWeight: 600 }}>{formatCurrency(app.loan_amount)}</td>
                                            <td><span className={`badge badge-${app.status}`}>{app.status.replace(/_/g, ' ')}</span></td>
                                            <td style={{ color: 'var(--text-muted)' }}>{new Date(app.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
