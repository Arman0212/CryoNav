/* Alerts Page */
import React from 'react';
import { Bell, Filter, CheckCheck } from 'lucide-react';
import useAlertStore from '@stores/useAlertStore';

export default function AlertsPage() {
  const { alerts, unreadCount, markAllRead } = useAlertStore();

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Alert Center</h1>
          <p className="page-subtitle">Navigation alerts, iceberg detections, risk changes, route invalidations</p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={markAllRead}>
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {alerts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {alerts.map((alert) => (
            <div key={alert.id} className={`alert-card ${alert.severity || 'info'}`} style={{ opacity: alert.read ? 0.6 : 1 }}>
              <Bell size={16} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{alert.title}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>{alert.description}</div>
              </div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>{alert.timestamp}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state" style={{ padding: 'var(--space-10)' }}>
            <Bell size={48} style={{ color: 'var(--color-accent-blue)', opacity: 0.3 }} />
            <h3 className="empty-state-title" style={{ marginTop: 'var(--space-4)' }}>No Alerts</h3>
            <p className="empty-state-description">
              Alerts will appear here when the system detects new icebergs, risk changes, route invalidations, or weather warnings.
              Connect WebSocket channels to enable real-time alerts.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
