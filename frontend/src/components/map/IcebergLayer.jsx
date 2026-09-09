/* ═══════════════════════════════════════════════════════════════
   IcebergLayer — the full iceberg picture, ported from web/app.js.

   For each berg this renders four things, which together are the point
   of the whole drift model:

     · Day 0 marker — where the berg actually is, with a radar pulse
     · Drift track — the mean_track polyline out to the horizon
     · Projected endpoint — where it is predicted to be at +N days,
       labelled with net displacement from Day 0
     · Ensemble ellipse — 2σ of the 50-member Monte Carlo spread at the
       final step, i.e. the honest uncertainty around that prediction

   Showing the prediction without the spread would overstate what the
   physics can actually tell you, which is why the ellipse is not
   optional decoration.
   ═══════════════════════════════════════════════════════════════ */

import React, { useMemo } from 'react';
import { Marker, Polyline, Circle, Tooltip, LayerGroup } from 'react-leaflet';
import L from 'leaflet';

const TRACK_COLOR = '#c98a00';
const ENSEMBLE_COLOR = '#c98a00';

/** Day-0 berg marker: pulsing radar ring behind an ice-floe glyph. */
const bergIcon = L.divIcon({
  className: 'berg-marker',
  html: `
    <div class="berg-marker-inner">
      <span class="berg-radar-pulse"></span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <polygon points="12,2 22,20 16,22 12,18 8,22 2,20"
                 fill="#0b7fa8" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
        <polygon points="12,2 16,22 12,18" fill="#075f7f" opacity="0.75"/>
      </svg>
    </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

/** Projected-position marker carrying a "+Nd" flag. */
function endIcon(days) {
  return L.divIcon({
    className: 'berg-target-marker',
    html: `
      <div class="berg-target-inner">
        <span class="berg-target-dot"></span>
        <span class="berg-target-flag">+${days}d</span>
      </div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

/** Great-circle-ish displacement in km between two lat/lon points. */
function displacementKm(lat0, lon0, lat1, lon1) {
  const dLat = (lat1 - lat0) * 111.32;
  const dLon = (lon1 - lon0) * 111.32 * Math.cos((lat0 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

/**
 * 2σ ensemble spread at the final step, as a circle in metres.
 * Returns null when there aren't enough members to say anything.
 */
function ensembleSpread(ensemble) {
  if (!ensemble || ensemble.length < 3) return null;
  const lastIdx = ensemble[0].length - 1;
  const lats = ensemble.map((e) => e[lastIdx]?.[0]).filter((v) => typeof v === 'number');
  const lons = ensemble.map((e) => e[lastIdx]?.[1]).filter((v) => typeof v === 'number');
  if (lats.length < 3) return null;

  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const meanLat = mean(lats);
  const meanLon = mean(lons);
  const std = (a, m) => Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length);

  const radiusLat = std(lats, meanLat) * 2 * 111320;
  const radiusLon = std(lons, meanLon) * 2 * 111320 * Math.cos((meanLat * Math.PI) / 180);
  // Floor at 6 km so a tight ensemble is still visible at low zoom
  return { lat: meanLat, lon: meanLon, radius: Math.max(radiusLat, radiusLon, 6000) };
}

export default function IcebergLayer({ bergs, horizon = 7, showTracks = true }) {
  const prepared = useMemo(
    () => (bergs || [])
      .filter((b) => b.mean_track?.length)
      .map((berg) => {
        const track = berg.mean_track;
        const [, startLat, startLon] = track[0];
        const last = track[track.length - 1];
        const [lastDay, endLat, endLon] = last;
        return {
          berg,
          startLat,
          startLon,
          endLat,
          endLon,
          days: lastDay || horizon,
          path: track.map((p) => [p[1], p[2]]),
          driftKm: displacementKm(startLat, startLon, endLat, endLon),
          spread: ensembleSpread(berg.ensemble),
        };
      }),
    [bergs, horizon]
  );

  return (
    <LayerGroup>
      {prepared.map((p) => (
        <React.Fragment key={p.berg.berg_id}>
          {/* Day 0 */}
          <Marker position={[p.startLat, p.startLon]} icon={bergIcon}>
            <Tooltip sticky className="map-tooltip">
              <div className="mt-title">Iceberg {p.berg.berg_id} · Day 0</div>
              <div className="mt-row">
                {Math.round(p.berg.length_m)} m × {Math.round(p.berg.width_m)} m
              </div>
              <div className="mt-dim">
                {Math.abs(p.startLat).toFixed(2)}°S, {Math.abs(p.startLon).toFixed(2)}°
                {p.startLon < 0 ? 'W' : 'E'}
              </div>
              {p.berg.observed_on && (
                <div className="mt-dim">Observed {p.berg.observed_on}</div>
              )}
            </Tooltip>
          </Marker>

          {showTracks && p.path.length > 1 && (
            <>
              {/* Drift track */}
              <Polyline
                positions={p.path}
                pathOptions={{ color: TRACK_COLOR, weight: 2, opacity: 0.85, dashArray: '5 3' }}
              />

              {/* Projected endpoint */}
              <Marker position={[p.endLat, p.endLon]} icon={endIcon(p.days)}>
                <Tooltip sticky className="map-tooltip">
                  <div className="mt-title">Day +{p.days} projected</div>
                  <div className="mt-row">Berg {p.berg.berg_id}</div>
                  <div className="mt-dim">
                    {Math.abs(p.endLat).toFixed(2)}°S, {Math.abs(p.endLon).toFixed(2)}°
                    {p.endLon < 0 ? 'W' : 'E'}
                  </div>
                  <div className="mt-accent">Net drift {p.driftKm.toFixed(0)} km</div>
                </Tooltip>
              </Marker>

              {/* Monte Carlo uncertainty */}
              {p.spread && (
                <Circle
                  center={[p.spread.lat, p.spread.lon]}
                  radius={p.spread.radius}
                  pathOptions={{
                    color: ENSEMBLE_COLOR,
                    opacity: 0.5,
                    fillColor: ENSEMBLE_COLOR,
                    fillOpacity: 0.08,
                    weight: 1.5,
                    dashArray: '4 4',
                  }}
                >
                  <Tooltip className="map-tooltip">
                    <div className="mt-title">Drift uncertainty</div>
                    <div className="mt-dim">
                      2σ of {p.berg.ensemble?.length ?? 0} ensemble members at day +{p.days}
                    </div>
                  </Tooltip>
                </Circle>
              )}
            </>
          )}
        </React.Fragment>
      ))}
    </LayerGroup>
  );
}
