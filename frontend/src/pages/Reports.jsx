import { useState, useEffect } from 'react';
import Topbar from '../components/Topbar';
import api from '../api/axios';
import * as Icons from '../components/Icons';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, CartesianGrid
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const STATUS_COLORS = {
    draft: '#94a3b8', submitted: '#6366f1', under_review: '#f59e0b',
    kyc_verified: '#3b82f6', credit_checked: '#8b5cf6', approved: '#10b981',
    rejected: '#ef4444', disbursal_ready: '#14b8a6', disbursed: '#22c55e',
};

const formatCurrency = (val) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

const ChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem' }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{label}</p>
                {payload.map((entry, i) => (
                    <p key={i} style={{ margin: '2px 0', color: entry.color || entry.fill }}>
                        {entry.name}: <strong>{entry.value}</strong>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function Reports() {
    const [appReport, setAppReport] = useState(null);
    const [feeReport, setFeeReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => { loadReports(); }, []);

    const loadReports = async () => {
        try {
            const [appRes, feeRes] = await Promise.all([
                api.get('/reports/applications/'),
                api.get('/reports/fees/'),
            ]);
            setAppReport(appRes.data);
            setFeeReport(feeRes.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    if (loading) return (
        <><Topbar title="Reports" /><div className="page-content"><div className="loading-spinner"><div className="spinner"></div></div></div></>
    );

    const statusChartData = (appReport?.by_status || []).map((item) => ({
        name: item.status.replace(/_/g, ' '),
        count: item.count,
        amount: item.total_amount || 0,
        fill: STATUS_COLORS[item.status] || '#6366f1',
    }));

    const cityChartData = (appReport?.by_city || []).slice(0, 10).map((item) => ({
        name: item.city, count: item.count,
    }));

    const dateChartData = (appReport?.by_date || []).slice(-20).map((item) => ({
        name: item.date ? item.date.slice(5) : '', applications: item.count,
    }));

    const agentChartData = (appReport?.by_agent || []).slice(0, 8).map((item) => ({
        name: `${item.agent__first_name || ''} ${item.agent__last_name || ''}`.trim() || 'Unassigned',
        count: item.count, amount: item.total_amount || 0,
    }));

    const feeStatusData = (feeReport?.by_status || []).map((item, i) => ({
        name: item.status, value: item.count, amount: item.total || 0, fill: COLORS[i % COLORS.length],
    }));

    const totalApps = statusChartData.reduce((acc, s) => acc + s.count, 0);
    const approved = statusChartData.find((s) => s.name === 'approved')?.count || 0;
    const rejected = statusChartData.find((s) => s.name === 'rejected')?.count || 0;

    return (
        <>
            <Topbar title="Reports & Analytics" />
            <div className="page-content">
                <div className="filters-bar" style={{ marginBottom: '20px' }}>
                    {[['overview', 'Overview'], ['trends', 'Trends'], ['agents', 'Agents'], ['fees', 'Fees']].map(([tab, label]) => (
                        <button key={tab} className={`filter-chip ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{label}</button>
                    ))}
                </div>

                {activeTab === 'overview' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="card" style={{ gridColumn: 'span 2' }}>
                            <h3 className="card-title" style={{ marginBottom: '20px' }}>Applications by Status</h3>
                            {statusChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={statusChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                                        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Bar dataKey="count" name="Applications" radius={[4, 4, 0, 0]}>
                                            {statusChartData.map((entry, index) => (
                                                <Cell key={index} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <p style={{ color: 'var(--text-muted)' }}>No application data yet</p>}
                        </div>

                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: '20px' }}>Status Distribution</h3>
                            {statusChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={230}>
                                    <PieChart>
                                        <Pie data={statusChartData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({ name, count }) => count > 0 ? `${name}: ${count}` : ''} labelLine={false} fontSize={10}>
                                            {statusChartData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                                        </Pie>
                                        <Tooltip formatter={(val, name) => [val, name]} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <p style={{ color: 'var(--text-muted)' }}>No data</p>}
                        </div>

                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: '20px' }}>Top Cities</h3>
                            {cityChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={230}>
                                    <BarChart data={cityChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                                        <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
                                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={90} />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Bar dataKey="count" name="Applications" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <p style={{ color: 'var(--text-muted)' }}>No city data</p>}
                        </div>
                    </div>
                )}

                {activeTab === 'trends' && (
                    <div style={{ display: 'grid', gap: '20px' }}>
                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: '20px' }}>Daily Application Volume (Last 20 Days)</h3>
                            {dateChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={dateChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                                        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Bar dataKey="applications" name="Applications" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <p style={{ color: 'var(--text-muted)' }}>No trend data available</p>}
                        </div>

                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: '16px' }}>Rejection &amp; Approval Analytics</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                                <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(16,185,129,0.07)', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--success-500)' }}>
                                        {totalApps ? ((approved / totalApps) * 100).toFixed(1) : 0}%
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Approval Rate</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{approved} apps</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(239,68,68,0.07)', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--danger-500)' }}>
                                        {totalApps ? ((rejected / totalApps) * 100).toFixed(1) : 0}%
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Rejection Rate</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{rejected} apps</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(99,102,241,0.07)', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary-400)' }}>{totalApps}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Total Applications</div>
                                </div>
                            </div>
                            <div className="table-container">
                                <table>
                                    <thead><tr><th>Status</th><th>Count</th><th>Share</th><th>Loan Value</th></tr></thead>
                                    <tbody>
                                        {statusChartData.map((item) => (
                                            <tr key={item.name}>
                                                <td><span className={`badge badge-${item.name.replace(/ /g, '_')}`}>{item.name}</span></td>
                                                <td><strong>{item.count}</strong></td>
                                                <td>{totalApps ? ((item.count / totalApps) * 100).toFixed(1) : 0}%</td>
                                                <td>{formatCurrency(item.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'agents' && (
                    <div style={{ display: 'grid', gap: '20px' }}>
                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: '20px' }}>Agent Performance — Applications Submitted</h3>
                            {agentChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={agentChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                                        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Bar dataKey="count" name="Applications" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <p style={{ color: 'var(--text-muted)' }}>No agent data</p>}
                        </div>
                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: '16px' }}>Agent Leaderboard</h3>
                            <div className="table-container">
                                <table>
                                    <thead><tr><th>#</th><th>Agent</th><th>Applications</th><th>Loan Value</th></tr></thead>
                                    <tbody>
                                        {agentChartData.map((item, i) => (
                                            <tr key={i}>
                                                <td><strong style={{ color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'inherit' }}>{i + 1}</strong></td>
                                                <td>{item.name}</td>
                                                <td>{item.count}</td>
                                                <td>{formatCurrency(item.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'fees' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="card" style={{ gridColumn: 'span 2' }}>
                            <h3 className="card-title" style={{ marginBottom: '16px' }}>Fee Collection Summary</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(16,185,129,0.07)', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--success-500)' }}>{formatCurrency(feeReport?.total_collected)}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Total Collected</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(239,68,68,0.07)', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--danger-500)' }}>{formatCurrency(feeReport?.total_pending)}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Pending Collection</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(99,102,241,0.07)', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--primary-400)' }}>{feeReport?.total_records || 0}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Total Records</div>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: '20px' }}>Fee Status Pie</h3>
                            {feeStatusData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={230}>
                                    <PieChart>
                                        <Pie data={feeStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={11}>
                                            {feeStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                        </Pie>
                                        <Tooltip formatter={(val, name) => [val, name]} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <p style={{ color: 'var(--text-muted)' }}>No fee records</p>}
                        </div>

                        <div className="card">
                            <h3 className="card-title" style={{ marginBottom: '16px' }}>Fee Status Details</h3>
                            {(feeReport?.by_status || []).map((item) => (
                                <div className="detail-row" key={item.status}>
                                    <span className={`badge badge-${item.status}`}>{item.status}</span>
                                    <span className="detail-value">{item.count} records ({formatCurrency(item.total)})</span>
                                </div>
                            ))}
                            {(!feeReport?.by_status || feeReport.by_status.length === 0) && (
                                <p style={{ color: 'var(--text-muted)' }}>No fee data</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
