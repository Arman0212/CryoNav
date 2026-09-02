/* ═══════════════════════════════════════════════════════════════
   EPSG:3031 — Antarctic Polar Stereographic CRS for Leaflet.

   Web Mercator (EPSG:3857) cannot represent the pole at all and
   grossly distorts everything south of ~60°S, which is the entire
   CryoNav domain. EPSG:3031 is the standard projection for Antarctic
   work and is what NASA GIBS serves its polar tiles in.

   The tile grid below is transcribed from GIBS' own capabilities doc:
     https://gibs.earthdata.nasa.gov/wmts/epsg3031/best/1.0.0/WMTSCapabilities.xml
   Resolution per level = ScaleDenominator × 0.28e-3 (the WMTS standard
   pixel size), giving 8192 m/px at level 0 down to 256 m/px at level 5.
   ═══════════════════════════════════════════════════════════════ */

import L from 'leaflet';
import 'proj4leaflet';

export const EPSG3031_PROJ4 =
  '+proj=stere +lat_0=-90 +lat_ts=-71 +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs';

/** Half-width of the GIBS polar grid, in projected metres. */
export const GIBS_EXTENT = 4194304;

/** Metres per pixel at zoom 0..5. 512px tiles × 8192 m/px × 2 tiles = full extent. */
export const GIBS_RESOLUTIONS = [8192, 4096, 2048, 1024, 512, 256];

export const GIBS_TILE_SIZE = 512;

/** Deepest zoom each GIBS TileMatrixSet actually provides. */
export const GIBS_MAX_ZOOM = { '1km': 3, '500m': 4, '250m': 5 };

export const EPSG3031 = new L.Proj.CRS('EPSG:3031', EPSG3031_PROJ4, {
  origin: [-GIBS_EXTENT, GIBS_EXTENT],
  resolutions: GIBS_RESOLUTIONS,
  bounds: L.bounds([-GIBS_EXTENT, -GIBS_EXTENT], [GIBS_EXTENT, GIBS_EXTENT]),
});
