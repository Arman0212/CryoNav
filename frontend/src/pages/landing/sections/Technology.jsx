/* SECTION 13 — THE TECHNOLOGY
   Only technologies actually present in the repository are listed here.
   Notably absent by design: PostgreSQL/PostGIS — there is no database layer
   in this codebase (state lives in the Zarr cube and on disk), so claiming
   one would be false. */
import React from 'react';
import SectionShell from '@components/landing/SectionShell';
import SectionReveal from '@components/landing/SectionReveal';

const LAYERS = [
  { name: 'Observation', tech: 'NSIDC Sea-Ice CDR · ERA5 · GLORYS · BYU/NIC Bergs · IBCSO/GEBCO' },
  { name: 'Data Cube', tech: 'Zarr · xarray · dask — analysis-ready, 25 km polar stereographic' },
  { name: 'Sea-Ice Model', tech: 'PyTorch U-Net · 1–14 day horizon · four baseline comparators' },
  { name: 'Berg Dynamics', tech: 'Momentum-balance drift · perturbed ensemble · NumPy / SciPy' },
  { name: 'Risk Engine', tech: 'POLARIS-style RIO banding · speed-in-ice curve · fuel model' },
  { name: 'Routing', tech: 'Time-expanded A* · 16-connected grid · path smoothing' },
  { name: 'API', tech: 'FastAPI · Uvicorn — forecast, observed, bergs, route, metrics' },
  { name: 'Interface', tech: 'React 18 · Vite · Leaflet · TanStack Query · Zustand' },
];

export default function Technology() {
  return (
    <SectionShell id="technology" num="13" label="The Technology">
      <div className="lp-stack-lg">
        <SectionReveal from="up">
          <h2 className="lp-display">
            Built as a<br /><span className="lp-gradient-text">stack</span>, not a demo
          </h2>
        </SectionReveal>
        <SectionReveal from="up" delay={120}>
          <p className="lp-lede">
            Observation flows upward through the cube, the models, the risk engine,
            and the router before it reaches a screen. Each layer is replaceable
            without rewriting the ones above it.
          </p>
        </SectionReveal>
      </div>

      <div className="lp-stack-layers">
        {LAYERS.map((layer, i) => (
          <SectionReveal key={layer.name} from="left" delay={i * 60} className="lp-layer">
            <div>
              <div className="lp-layer-name">{layer.name}</div>
              <div className="lp-layer-tech">{layer.tech}</div>
            </div>
            <span className="lp-mono lp-dim">{String(LAYERS.length - i).padStart(2, '0')}</span>
          </SectionReveal>
        ))}
      </div>
    </SectionShell>
  );
}
