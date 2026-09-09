/* Ocean Intelligence — real CMEMS GLORYS12 reanalysis via GET /ocean.

   This page used to say "Not Connected" because the ocean variables had
   no API route, even though uo/vo/sst/zos have been in the data cube all
   along. They're now served, so every figure below is real reanalysis for
   the selected date — with the cube's own provenance flag shown rather
   than assumed. */

import React from 'react';
import { Waves, Navigation, Thermometer, ArrowUpDown } from 'lucide-react';
import useAppStore from '@stores/useAppStore';
import { useOcean } from '@hooks/useOcean';

function Stat({ icon: Icon, label, value, unit, color, loading }) {
  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 'var(--space-2)', color }}>
        <Icon size={16} /> {label}
      </div>
      <div className="stat-card">
        <span className="stat-value" style={{ color: loading ? 'var(--color-text-muted)' : color }}>
          {loading ? '…' : (value ?? '—')}
        </span>
        <span className="stat-label">{unit}</span>
      </div>
    </div>
  );
}

export default function OceanPage() {
  const selectedDate = useAppStore((s) => s.selectedDate);
  const { data, isLoading, isError, error } = useOcean(selectedDate, 8);

  const s = data?.stats;
  const fmt = (v, d = 2) => (typeof v === 'number' ? v.toFixed(d) : null);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Ocean Intelligence</h1>
        <p className="page-subtitle">
          Surface currents, temperature and sea level — CMEMS GLORYS12 reanalysis
        </p>
      </div>

      {isError && (
        <div className="alert-card critical" style={{ marginBottom: 'var(--space-4)' }}>
          <span>{error?.response?.data?.detail || error?.message || 'Could not reach /ocean'}</span>
        </div>
      )}

      {data && (
        <div className="alert-card info" style={{ marginBottom: 'var(--space-4)' }}>
          <span>
            {data.source} · {data.date}
            {data.is_real === false && ' — gap-filled for this date, not reanalysis'}
            {' · '}{data.vectors?.length ?? 0} current vectors
          </span>
        </div>
      )}

      <div className="grid-4" style={{ marginBottom: 'var(--space-4)' }}>
        <Stat icon={Navigation} label="Mean Current" loading={isLoading}
          value={fmt(s?.mean_current_ms)} unit="m/s" color="var(--color-accent-teal)" />
        <Stat icon={Waves} label="Peak Current" loading={isLoading}
          value={fmt(s?.max_current_ms)} unit="m/s" color="var(--color-accent-cyan)" />
        <Stat icon={Thermometer} label="Mean SST" loading={isLoading}
          value={fmt(s?.mean_sst_c)} unit="°C" color="var(--color-accent-blue)" />
        <Stat icon={ArrowUpDown} label="Mean SSH" loading={isLoading}
          value={fmt(s?.mean_ssh_m)} unit="metres" color="var(--color-accent-purple)" />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title"><Navigation size={16} /> Surface Current Field</div>
          <div className="data-quality real">
            <span className="data-quality-dot" /><span>Real (CMEMS)</span>
          </div>
        </div>
        <p className="empty-state-description" style={{ padding: 'var(--space-4)' }}>
          The current field is drawn as vectors on the Map page — switch on
          the <strong>Ocean Currents</strong> layer there to see it over the
          ice and route. The Antarctic Circumpolar Current sets the
          background transport that carries icebergs east, which is why
          these vectors and the drift tracks tend to agree.
        </p>
      </div>
    </div>
  );
}
