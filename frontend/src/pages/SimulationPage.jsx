/* Simulation Page — Digital Twin */
import React from 'react';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';
import useSimulationStore from '@stores/useSimulationStore';
import { SIMULATION_STEPS } from '@utils/constants';

export default function SimulationPage() {
  const { status, playbackSpeed, setPlaybackSpeed, play, pause, reset } = useSimulationStore();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Mission Simulation</h1>
        <p className="page-subtitle">Digital twin — Replay and forecast mission scenarios</p>
      </div>

      {/* Timeline */}
      <div className="sim-timeline" style={{ marginBottom: 'var(--space-4)' }}>
        <button className="btn btn-ghost btn-icon" onClick={reset} title="Reset"><RotateCcw size={16} /></button>
        <button
          className="btn btn-primary btn-icon"
          onClick={status === 'playing' ? pause : play}
          title={status === 'playing' ? 'Pause' : 'Play'}
        >
          {status === 'playing' ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          {[1, 2, 5, 10].map((speed) => (
            <button
              key={speed}
              className={`btn btn-sm ${playbackSpeed === speed ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPlaybackSpeed(speed)}
            >
              {speed}x
            </button>
          ))}
        </div>
        <div className="sim-timeline-track" style={{ flex: 1 }}>
          <div className="sim-timeline-progress" style={{ width: '0%' }} />
        </div>
        <span className="text-mono" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
          {status.toUpperCase()}
        </span>
      </div>

      {/* Timeline Labels */}
      <div className="sim-timeline-labels" style={{ marginBottom: 'var(--space-6)', padding: '0 88px' }}>
        {SIMULATION_STEPS.map((step) => (
          <span key={step.label} style={{ fontWeight: step.hours === 0 ? 700 : 400, color: step.hours === 0 ? 'var(--color-accent-cyan)' : undefined }}>
            {step.label}
          </span>
        ))}
      </div>

      <div className="grid-2">
        {/* Environment State at Sim Time */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Environment State</div>
            <span className="badge badge-purple">Simulation</span>
          </div>
          <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
            <p className="empty-state-description">
              SIC %, iceberg count, wind, risk at simulation time. Updates as timeline progresses.
            </p>
          </div>
        </div>

        {/* Event Log */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Event Log</div>
          </div>
          <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
            <p className="empty-state-description">
              Simulation events: "T+6H: Iceberg B-42 detected", "T+8H: Route invalidated", "T+10H: Reroute complete"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
