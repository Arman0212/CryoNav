/* Trajectory Analysis Page — real RK4 ensemble visualization from GET /bergs.
   Reads ?bergId=&date= from the URL (set by the "View Trajectory" button on
   the Icebergs page) and plots the mean track + ensemble spread as an SVG. */
import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Navigation } from 'lucide-react';
import useAppStore from '@stores/useAppStore';
import { useIcebergs } from '@hooks/useIcebergs';
import { formatCoords } from '@utils/formatters';

const WIDTH = 560;
const HEIGHT = 320;
const PAD = 24;

function EnsemblePlot({ berg }) {
  const { meanPath, ensemblePaths } = useMemo(() => {
    const track = berg.mean_track || []; // [[day, lat, lon], ...]
    const ensemble = berg.ensemble || []; // [n][d+1][2]

    const allPoints = [
      ...track.map(([, lat, lon]) => [lat, lon]),
      ...ensemble.flat(),
    ];
    const lats = allPoints.map((p) => p[0]);
    const lons = allPoints.map((p) => p[1]);
    const latMin = Math.min(...lats), latMax = Math.max(...lats);
    const lonMin = Math.min(...lons), lonMax = Math.max(...lons);
    const latSpan = latMax - latMin || 1;
    const lonSpan = lonMax - lonMin || 1;

    const project = ([lat, lon]) => {
      const x = PAD + ((lon - lonMin) / lonSpan) * (WIDTH - 2 * PAD);
      const y = HEIGHT - PAD - ((lat - latMin) / latSpan) * (HEIGHT - 2 * PAD); // north up
      return [x, y];
    };

    const toPath = (points) => points.map(project).map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

    return {
      meanPath: toPath(track.map(([, lat, lon]) => [lat, lon])),
      ensemblePaths: ensemble.map((member) => toPath(member)),
      project,
      startEnd: track.length ? [project([track[0][1], track[0][2]]), project([track[track.length - 1][1], track[track.length - 1][2]])] : null,
    };
  }, [berg]);

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ width: '100%', height: 'auto', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
      {ensemblePaths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="var(--color-accent-cyan)" strokeWidth="1" opacity="0.25" />
      ))}
      <path d={meanPath} fill="none" stroke="var(--color-accent-purple)" strokeWidth="2.5" />
    </svg>
  );
}

export default function TrajectoryPage() {
  const [searchParams] = useSearchParams();
  const appSelectedDate = useAppStore((s) => s.selectedDate);
  const bergId = searchParams.get('bergId');
  const date = searchParams.get('date') || appSelectedDate;

  const { data: bergs, isLoading, isError } = useIcebergs(date, 7);
  const berg = bergs?.find((b) => b.berg_id === bergId);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Trajectory Analysis</h1>
        <p className="page-subtitle">Detailed iceberg trajectory analysis with ensemble predictions and uncertainty visualization</p>
      </div>
      <div className="card">
        <div className="card-header">
          <div className="card-title"><Navigation size={16} /> Ensemble Trajectory Viewer</div>
          <span className="model-tag">RK4 · Ensemble Perturbation</span>
        </div>

        {!bergId && (
          <div className="empty-state" style={{ padding: 'var(--space-10)' }}>
            <Navigation size={48} style={{ color: 'var(--color-accent-cyan)', opacity: 0.3 }} />
            <h3 className="empty-state-title" style={{ marginTop: 'var(--space-4)' }}>Select an Iceberg</h3>
            <p className="empty-state-description">
              Choose an iceberg from the Icebergs page to view its full ensemble trajectory prediction here.
            </p>
          </div>
        )}

        {bergId && isLoading && (
          <div className="empty-state" style={{ padding: 'var(--space-10)' }}><p className="empty-state-description">Loading /bergs…</p></div>
        )}

        {bergId && !isLoading && (isError || !berg) && (
          <div className="empty-state" style={{ padding: 'var(--space-10)' }}>
            <p className="empty-state-description">Could not find {bergId} in /bergs for {date}. The synthetic demo set is regenerated per request, so ids may shift between calls.</p>
          </div>
        )}

        {berg && (
          <div style={{ padding: 'var(--space-4)' }}>
            <EnsemblePlot berg={berg} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-3)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              <span><strong>{berg.berg_id}</strong> · {Math.round(berg.length_m)}m × {Math.round(berg.width_m)}m</span>
              <span>{berg.ensemble?.length ?? 0} ensemble members over {(berg.mean_track?.length ?? 1) - 1} days</span>
            </div>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-2)' }}>
              Purple line: mean RK4 track. Faint cyan lines: individual ensemble members (±20% perturbation on drag coefficients and forcing, per config/routing.yaml berg_drift.perturbation_fraction).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
