/* Analytics Page — Model performance, system metrics
   "Model Performance" and "Data Coverage" are wired to the real GET
   /metrics endpoint; "API Latency" and "Route Statistics" have no
   backing endpoint (no latency instrumentation or route history is
   persisted server-side), so they stay as placeholders. */
import React from 'react';
import { BarChart3, Cpu, Database, Activity } from 'lucide-react';
import { useMetrics } from '@hooks/useMetrics';

export default function AnalyticsPage() {
  const { data, isLoading, isError, error } = useMetrics();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Model performance, forecast skill, route statistics, system metrics</p>
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title"><BarChart3 size={16} /> Model Performance</div></div>
          {isLoading && <div className="empty-state" style={{ padding: 'var(--space-8)' }}><p className="empty-state-description">Loading /metrics…</p></div>}
          {isError && (
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              <p className="empty-state-description">{error?.response?.data?.detail || error?.message || 'Failed to reach /metrics'}</p>
            </div>
          )}
          {data && Array.isArray(data.baselines) && data.baselines.length > 0 ? (
            <table className="table">
              <thead>
                <tr>{Object.keys(data.baselines[0]).map((k) => <th key={k}>{k}</th>)}</tr>
              </thead>
              <tbody>
                {data.baselines.map((row, i) => (
                  <tr key={i}>{Object.values(row).map((v, j) => <td key={j}>{v}</td>)}</tr>
                ))}
              </tbody>
            </table>
          ) : (
            data && (
              <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                <p className="empty-state-description">
                  /metrics is reachable but returned no `baselines` (results/baselines.csv not present on the server). Training history present: {data.training_history ? 'yes' : 'no'}.
                </p>
              </div>
            )
          )}
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title"><Activity size={16} /> API Latency</div></div>
          <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
            <p className="empty-state-description">No latency instrumentation exists on the backend yet — endpoint response times, request counts, and error rates aren't tracked server-side.</p>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title"><Database size={16} /> Data Coverage</div></div>
          {data ? (
            <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Baselines CSV</span>
                <span className={`badge ${data.baselines ? 'badge-success' : 'badge-danger'}`}>{data.baselines ? 'Available' : 'Missing'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Training History</span>
                <span className={`badge ${data.training_history ? 'badge-success' : 'badge-danger'}`}>{data.training_history ? 'Available' : 'Missing'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Skill vs. Lead Plot</span>
                <span className={`badge ${data.skill_plot_available ? 'badge-success' : 'badge-danger'}`}>{data.skill_plot_available ? 'Available' : 'Missing'}</span>
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              <p className="empty-state-description">Temporal coverage heatmap (real vs. synthetic dates) isn't exposed by the API yet — this section is limited to what /metrics reports.</p>
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title"><Cpu size={16} /> Route Statistics</div></div>
          <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
            <p className="empty-state-description">The backend doesn't persist route history — each POST /route call is stateless. Route stats here would need client-side history (e.g. logging each Routes-page run) or a backend change.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
