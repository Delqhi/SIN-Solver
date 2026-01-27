import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { surveyApi } from '../api/surveyApi';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

function EarningsDashboard() {
  const [earnings, setEarnings] = useState(null);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEarnings();
  }, [period]);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const data = await surveyApi.getEarnings(period);
      setEarnings(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setEarnings({
        total: 0,
        surveysCompleted: 0,
        timeline: [],
        perPlatform: []
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!earnings?.perPlatform) return;
    
    const rows = [
      ['Platform', 'Surveys', 'Earnings', 'Status'],
      ...earnings.perPlatform.map(p => [p.platform, p.surveys || 0, p.earnings || 0, p.status || 'unknown'])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `earnings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="loading">Loading earnings data...</div>;
  }

  const avgPerSurvey = earnings?.surveysCompleted > 0 
    ? (earnings.total / earnings.surveysCompleted).toFixed(2) 
    : '0.00';

  const projectedMonthly = ((earnings?.total || 0) * (period === 'day' ? 30 : period === 'week' ? 4 : 1)).toFixed(2);

  return (
    <div className="earnings-dashboard">
      <div className="page-header">
        <h2>💰 Earnings Dashboard</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn ${period === 'day' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPeriod('day')}
          >
            Today
          </button>
          <button
            className={`btn ${period === 'week' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPeriod('week')}
          >
            This Week
          </button>
          <button
            className={`btn ${period === 'month' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPeriod('month')}
          >
            This Month
          </button>
        </div>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '20px' }}>{error}</div>}

      <div className="stats-bar">
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
          <div className="stat-value">€{earnings?.total?.toFixed(2) || '0.00'}</div>
          <div className="stat-label">Total Earnings</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
          <div className="stat-value">{earnings?.surveysCompleted || 0}</div>
          <div className="stat-label">Surveys Completed</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
          <div className="stat-value">€{avgPerSurvey}</div>
          <div className="stat-label">Avg per Survey</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
          <div className="stat-value">€{projectedMonthly}</div>
          <div className="stat-label">Projected Monthly</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ marginBottom: '16px' }}>Earnings Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={earnings?.timeline || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="date" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
              />
              <Legend />
              <Line type="monotone" dataKey="earnings" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px' }}>
          <h3 style={{ marginBottom: '16px' }}>Earnings by Platform</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={earnings?.perPlatform || []}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                dataKey="earnings"
                nameKey="platform"
                label={({ platform, percent }) => `${platform} (${(percent * 100).toFixed(0)}%)`}
              >
                {(earnings?.perPlatform || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>Platform Breakdown</h3>
          <button className="btn btn-secondary" onClick={exportToCSV}>
            📥 Export CSV
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-secondary)' }}>Platform</th>
              <th style={{ textAlign: 'right', padding: '12px', color: 'var(--text-secondary)' }}>Surveys</th>
              <th style={{ textAlign: 'right', padding: '12px', color: 'var(--text-secondary)' }}>Earnings</th>
              <th style={{ textAlign: 'right', padding: '12px', color: 'var(--text-secondary)' }}>Avg/Survey</th>
              <th style={{ textAlign: 'center', padding: '12px', color: 'var(--text-secondary)' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {(earnings?.perPlatform || []).map((p, idx) => (
              <tr key={p.platform} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px' }}>
                  <span style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '3px', 
                    background: COLORS[idx % COLORS.length],
                    display: 'inline-block',
                    marginRight: '8px'
                  }}></span>
                  {p.platform}
                </td>
                <td style={{ textAlign: 'right', padding: '12px' }}>{p.surveys || 0}</td>
                <td style={{ textAlign: 'right', padding: '12px' }}>€{(p.earnings || 0).toFixed(2)}</td>
                <td style={{ textAlign: 'right', padding: '12px' }}>
                  €{p.surveys > 0 ? (p.earnings / p.surveys).toFixed(2) : '0.00'}
                </td>
                <td style={{ textAlign: 'center', padding: '12px' }}>
                  <span className={`status-badge ${p.status || 'stopped'}`}>{p.status || 'stopped'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EarningsDashboard;
