/**
 * CryoNav — Frontend Application
 * 
 * Polar map with toggleable layers:
 *   - Forecast SIC (blue→white colormap)
 *   - Observed SIC overlay
 *   - Forecast − Observed difference (proof layer)
 *   - Iceberg positions with uncertainty ellipses
 *   - Candidate routes (4+ in distinct colours)
 *   - Station markers, bathymetry contours
 */

const API = '';  // Same origin
const ROUTE_COLORS = {
    great_circle: '#ff6b6b',
    min_ice: '#4ecdc4',
    min_time: '#ffd93d',
    balanced: '#2ed573',
    persistence_route: '#a55eea',
};

// ─── State ───
let map;
let layers = {
    forecast: null,
    observed: null,
    difference: null,
    bergs: null,
    routes: null,
    stations: null,
};
let layerVisibility = {
    forecast: true,
    observed: false,
    difference: false,
    bergs: true,
    routes: true,
};
let grid = null;            // /grid — lat/lon/land_mask, fetched once
let currentForecast = null;
let currentObserved = null;
let animationInterval = null;

// ─── Initialisation ───
document.addEventListener('DOMContentLoaded', async () => {
    initMap();
    addStationMarkers();
    await loadGrid();
    loadBergs();
});

// Grid geometry never changes, so it is fetched once here rather than being
// re-sent with every forecast (the lead-day animation fires 14 of those).
async function loadGrid() {
    try {
        const res = await fetch(`${API}/grid`);
        if (res.ok) grid = await res.json();
        else setStatus('Could not load grid');
    } catch (err) {
        console.error('Grid load failed:', err);
        setStatus('Could not load grid');
    }
}

function initMap() {
    map = L.map('map-canvas', {
        center: [-65, 50],
        zoom: 3,
        minZoom: 2,
        maxZoom: 8,
        zoomControl: true,
        attributionControl: false,
    });
    
    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
        opacity: 0.6,
    }).addTo(map);
    
    // Antarctic circle
    L.circle([-90, 0], {
        radius: 2600000,
        color: 'rgba(0, 212, 255, 0.15)',
        fillColor: 'rgba(0, 212, 255, 0.03)',
        weight: 1,
        dashArray: '8 4',
    }).addTo(map);
    
    // Domain boundary
    const bounds = [
        [-50, -20], [-50, 120], [-78, 120], [-78, -20], [-50, -20]
    ];
    L.polyline(bounds, {
        color: 'rgba(0, 212, 255, 0.25)',
        weight: 1,
        dashArray: '4 4',
    }).addTo(map);
}

function addStationMarkers() {
    const stations = [
        { name: 'Bharati', lat: -69.40, lon: 76.20, icon: '🏔' },
        { name: 'Maitri', lat: -70.00, lon: 11.50, icon: '🏔' },
    ];
    
    const origins = [
        { name: 'Cape Town', lat: -33.92, lon: 18.42, icon: '⚓' },
        { name: 'Mid-Ocean WP', lat: -55.00, lon: 76.00, icon: '📍' },
    ];
    
    [...stations, ...origins].forEach(s => {
        const markerIcon = L.divIcon({
            className: 'station-marker',
            html: `<div style="
                background: rgba(10,18,40,0.9);
                border: 2px solid #00d4ff;
                border-radius: 8px;
                padding: 4px 8px;
                font-size: 11px;
                color: #e8f0f8;
                white-space: nowrap;
                box-shadow: 0 0 15px rgba(0,212,255,0.3);
                font-family: 'Inter', sans-serif;
                font-weight: 600;
            ">${s.icon} ${s.name}</div>`,
            iconSize: null,
            iconAnchor: [50, 12],
        });
        
        L.marker([s.lat, s.lon], { icon: markerIcon }).addTo(map);
    });
    
    layers.stations = L.layerGroup().addTo(map);
}

// ─── SIC Rendering ───
function sicColor(value) {
    if (value <= 0.01) return null; // transparent for open ocean
    
    // Blue → Cyan → White colormap
    const r = Math.round(10 + value * 245);
    const g = Math.round(25 + value * 230);
    const b = Math.round(50 + value * 205);
    const a = 0.3 + value * 0.5;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function diffColor(value) {
    // Red (under-predict) → transparent → Blue (over-predict)
    if (Math.abs(value) < 0.05) return null;
    if (value > 0) {
        const intensity = Math.min(value * 3, 1);
        return `rgba(0, 150, 255, ${intensity * 0.6})`;
    } else {
        const intensity = Math.min(-value * 3, 1);
        return `rgba(255, 71, 87, ${intensity * 0.6})`;
    }
}

function renderSICLayer(sicData, colorFn, layerName) {
    if (layers[layerName]) {
        map.removeLayer(layers[layerName]);
    }
    
    if (!sicData || !sicData.sic || !grid) return;
    
    const sic = sicData.sic;
    const lat = grid.lat;
    const lon = grid.lon;
    const shape = sicData.shape || grid.shape;
    const landMask = grid.land_mask;
    
    const rectangles = [];
    const cellSizeLat = 0.25; // approximate
    const cellSizeLon = 0.7;
    
    // Subsample for performance (every 2nd cell)
    const step = 2;
    
    for (let y = 0; y < shape[0]; y += step) {
        for (let x = 0; x < shape[1]; x += step) {
            const idx_y = y;
            const idx_x = x;
            
            if (landMask && landMask[idx_y] && landMask[idx_y][idx_x] > 0.5) continue;
            
            const val = sic[idx_y] ? sic[idx_y][idx_x] : 0;
            const color = colorFn(val);
            
            if (!color) continue;
            
            const cellLat = lat[idx_y] ? lat[idx_y][idx_x] : -65;
            const cellLon = lon[idx_y] ? lon[idx_y][idx_x] : 50;
            
            rectangles.push(
                L.rectangle(
                    [[cellLat - cellSizeLat, cellLon - cellSizeLon],
                     [cellLat + cellSizeLat, cellLon + cellSizeLon]],
                    { color: 'none', fillColor: color, fillOpacity: 1, weight: 0 }
                )
            );
        }
    }
    
    layers[layerName] = L.layerGroup(rectangles);
    
    if (layerVisibility[layerName]) {
        layers[layerName].addTo(map);
    }
}

// ─── API Calls ───
async function loadForecast() {
    const date = document.getElementById('input-date').value;
    const lead = document.getElementById('slider-lead').value;
    
    setStatus('Loading forecast...');
    
    try {
        // The forecast is initialized on `date` and valid at date+lead. The
        // observation must be pulled for that VALID date, not for `date` --
        // otherwise the difference layer shows the ice change over the lead
        // window rather than the model's error.
        const forecastRes = await fetch(`${API}/forecast?date=${date}&lead=${lead}`);
        if (!forecastRes.ok) throw new Error(`forecast: ${forecastRes.status}`);

        currentForecast = await forecastRes.json();
        renderSICLayer(currentForecast, sicColor, 'forecast');

        const validDate = currentForecast.stats?.valid_date;
        document.getElementById('chip-forecast-info').style.display = 'flex';
        document.getElementById('forecast-date-display').textContent =
            `${date} + ${lead}d = ${validDate || ''}` +
            (currentForecast.source === 'model' ? '' : ' (NOT A FORECAST)');
        if (currentForecast.warning) console.warn(currentForecast.warning);

        const observedRes = await fetch(`${API}/observed?date=${validDate}`);
        if (observedRes.ok) {
            currentObserved = await observedRes.json();
            renderSICLayer(currentObserved, sicColor, 'observed');

            const diff = computeDifference(currentForecast, currentObserved);
            renderSICLayer(diff, diffColor, 'difference');
        }

        setStatus(currentForecast.source === 'model'
            ? 'Forecast loaded'
            : 'No cached forecast for this date — showing observations');
    } catch (err) {
        setStatus('Error loading forecast');
        console.error(err);
    }
}

function computeDifference(forecast, observed) {
    if (!forecast.sic || !observed.sic) return null;
    
    const shape = forecast.shape;
    const diff = [];
    
    for (let y = 0; y < shape[0]; y++) {
        diff[y] = [];
        for (let x = 0; x < shape[1]; x++) {
            diff[y][x] = (forecast.sic[y]?.[x] || 0) - (observed.sic[y]?.[x] || 0);
        }
    }
    
    return { sic: diff, shape: shape };
}

async function computeRoute() {
    const btn = document.getElementById('btn-route');
    btn.classList.add('btn-loading');
    btn.textContent = 'Computing...';
    setStatus('Computing routes...');
    
    const body = {
        origin: document.getElementById('select-origin').value,
        destination: document.getElementById('select-dest').value,
        depart_date: document.getElementById('input-date').value,
        w_time: parseFloat(document.getElementById('slider-time').value),
        w_fuel: parseFloat(document.getElementById('slider-fuel').value),
        w_risk: parseFloat(document.getElementById('slider-risk').value),
    };
    
    try {
        const res = await fetch(`${API}/route`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        renderRoutes(data);
        updateRouteTable(data.comparison);
        updateRejections(data.comparison);
        updateMetrics(data);
        
        setStatus('Routes computed');
    } catch (err) {
        setStatus('Error computing routes');
        console.error(err);
    } finally {
        btn.classList.remove('btn-loading');
        btn.textContent = '⚡ Compute Routes';
    }
}

function renderRoutes(data) {
    if (layers.routes) {
        map.removeLayer(layers.routes);
    }
    
    const routeLayers = [];
    
    for (const [key, route] of Object.entries(data.routes)) {
        if (!route.success || !route.path_latlon || route.path_latlon.length === 0) continue;
        
        const color = ROUTE_COLORS[key] || '#ffffff';
        const weight = key === 'balanced' ? 4 : 2;
        const opacity = key === 'balanced' ? 1.0 : 0.6;
        const dashArray = key === 'great_circle' ? '8 6' : null;
        
        const latlngs = route.path_latlon.map(p => [p[0], p[1]]);
        
        const polyline = L.polyline(latlngs, {
            color: color,
            weight: weight,
            opacity: opacity,
            dashArray: dashArray,
            lineCap: 'round',
            lineJoin: 'round',
        });
        
        polyline.bindTooltip(`${route.profile_name}<br>
            ${route.distance_nm.toFixed(0)} nm · ${route.time_h.toFixed(0)} h`, {
            sticky: true,
            className: 'route-tooltip',
        });
        
        routeLayers.push(polyline);
    }
    
    // Origin and destination markers
    if (data.origin) {
        routeLayers.push(L.circleMarker([data.origin.lat, data.origin.lon], {
            radius: 8, color: '#00d4ff', fillColor: '#00d4ff', fillOpacity: 0.8, weight: 2,
        }));
    }
    if (data.destination) {
        routeLayers.push(L.circleMarker([data.destination.lat, data.destination.lon], {
            radius: 8, color: '#ff4757', fillColor: '#ff4757', fillOpacity: 0.8, weight: 2,
        }));
    }
    
    layers.routes = L.layerGroup(routeLayers);
    if (layerVisibility.routes) {
        layers.routes.addTo(map);
    }
}

async function loadBergs() {
    try {
        const res = await fetch(`${API}/bergs?date=2023-01-13&horizon=7`);
        if (!res.ok) return;
        
        const data = await res.json();
        renderBergs(data);
    } catch (err) {
        console.warn('Could not load bergs:', err);
    }
}

function renderBergs(data) {
    if (layers.bergs) {
        map.removeLayer(layers.bergs);
    }
    
    const bergLayers = [];
    
    for (const berg of data.bergs) {
        // Current position
        const lat = berg.mean_track[0][1];
        const lon = berg.mean_track[0][2];
        
        // Berg marker (triangle)
        const bergIcon = L.divIcon({
            className: 'berg-marker',
            html: `<div style="
                color: #ffd700;
                font-size: 16px;
                text-shadow: 0 0 8px rgba(255,215,0,0.5);
                cursor: pointer;
            ">▲</div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
        });
        
        const marker = L.marker([lat, lon], { icon: bergIcon });
        marker.bindTooltip(`${berg.berg_id}<br>${berg.length_m.toFixed(0)}m × ${berg.width_m.toFixed(0)}m`, {
            className: 'berg-tooltip'
        });
        bergLayers.push(marker);
        
        // Mean track
        if (berg.mean_track.length > 1) {
            const trackPoints = berg.mean_track.map(p => [p[1], p[2]]);
            bergLayers.push(L.polyline(trackPoints, {
                color: '#ffd700',
                weight: 1.5,
                opacity: 0.6,
                dashArray: '4 4',
            }));
        }
        
        // Ensemble spread (simplified ellipse at last position)
        if (berg.ensemble && berg.ensemble.length > 1) {
            const lastDay = Math.min(6, berg.ensemble[0].length - 1);
            const lats = berg.ensemble.map(e => e[lastDay]?.[0]).filter(v => v);
            const lons = berg.ensemble.map(e => e[lastDay]?.[1]).filter(v => v);
            
            if (lats.length > 2) {
                const meanLat = lats.reduce((a,b) => a+b, 0) / lats.length;
                const meanLon = lons.reduce((a,b) => a+b, 0) / lons.length;
                const stdLat = Math.sqrt(lats.reduce((a,l) => a + (l-meanLat)**2, 0) / lats.length);
                const stdLon = Math.sqrt(lons.reduce((a,l) => a + (l-meanLon)**2, 0) / lons.length);
                
                const radiusLat = stdLat * 2 * 111320;
                const radiusLon = stdLon * 2 * 111320 * Math.cos(meanLat * Math.PI / 180);
                const radius = Math.max(radiusLat, radiusLon, 5000);
                
                bergLayers.push(L.circle([meanLat, meanLon], {
                    radius: radius,
                    color: 'rgba(255, 215, 0, 0.3)',
                    fillColor: 'rgba(255, 215, 0, 0.08)',
                    weight: 1,
                    dashArray: '3 3',
                }));
            }
        }
    }
    
    layers.bergs = L.layerGroup(bergLayers);
    if (layerVisibility.bergs) {
        layers.bergs.addTo(map);
    }
}

// ─── UI Updates ───
function updateRouteTable(comparison) {
    const tbody = document.getElementById('route-table-body');
    if (!comparison || !comparison.table) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No routes</td></tr>';
        return;
    }
    
    const colorMap = {
        'great_circle': 'route-gc',
        'min_ice': 'route-minice', 
        'min_time': 'route-mintime',
        'balanced': 'route-balanced',
        'persistence_route': 'route-persistence',
    };
    
    tbody.innerHTML = comparison.table.map(row => {
        const isRec = row.key === 'balanced';
        const colorClass = colorMap[row.key] || '';
        return `
            <tr class="${isRec ? 'recommended' : ''}">
                <td><span class="route-color-dot ${colorClass}"></span>${row.profile.replace('(Recommended)', '').trim()}</td>
                <td>${row.success ? row.distance_nm : '—'}</td>
                <td>${row.success ? row.time_h : '—'}</td>
                <td>${row.success ? row.ice_hours_07 : '—'}</td>
                <td>${row.success ? row.fuel_t : '—'}</td>
            </tr>
        `;
    }).join('');
}

function updateRejections(comparison) {
    const container = document.getElementById('rejection-container');
    if (!comparison || !comparison.rejections) {
        container.innerHTML = '<div style="color:var(--text-muted);font-size:12px;text-align:center;">No data</div>';
        return;
    }
    
    container.innerHTML = comparison.rejections.map(r => `
        <div class="rejection-card ${r.recommended ? 'recommended' : ''} animate-slide">
            <div class="profile-name">${r.profile}</div>
            ${r.reason}
        </div>
    `).join('');
}

function updateMetrics(data) {
    const balanced = data.routes?.balanced;
    if (balanced && balanced.success) {
        document.getElementById('metric-distance').textContent = balanced.distance_nm.toFixed(0);
        document.getElementById('metric-time').textContent = balanced.time_h.toFixed(0);
        document.getElementById('metric-fuel').textContent = balanced.fuel_t.toFixed(0);
        document.getElementById('metric-ice').textContent = balanced.ice_hours_07.toFixed(0);
    }
}

// ─── Control Handlers ───
function updateSlider(name, value) {
    document.getElementById(`val-${name}`).textContent = parseFloat(value).toFixed(1);
}

function updateLeadDay(value) {
    document.getElementById('lead-day-value').textContent = value;
    
    // If forecast is loaded, update the display
    if (currentForecast) {
        const date = document.getElementById('input-date').value;
        loadForecastForLead(date, value);
    }
}

async function loadForecastForLead(date, lead) {
    try {
        const res = await fetch(`${API}/forecast?date=${date}&lead=${lead}`);
        if (res.ok) {
            currentForecast = await res.json();
            renderSICLayer(currentForecast, sicColor, 'forecast');
            
            document.getElementById('forecast-date-display').textContent =
                `${date} + ${lead}d = ${currentForecast.stats?.valid_date || ''}` +
                (currentForecast.source === 'model' ? '' : ' (NOT A FORECAST)');
        }
    } catch (err) {
        console.warn('Error updating lead day:', err);
    }
}

function toggleLayer(layerName) {
    layerVisibility[layerName] = !layerVisibility[layerName];
    
    const toggle = document.getElementById(`toggle-${layerName}`);
    if (toggle) {
        toggle.classList.toggle('active', layerVisibility[layerName]);
    }
    
    if (layers[layerName]) {
        if (layerVisibility[layerName]) {
            layers[layerName].addTo(map);
        } else {
            map.removeLayer(layers[layerName]);
        }
    }
}

function setDemoDate(date) {
    document.getElementById('input-date').value = date;
    loadForecast();
}

function animateLeadDays() {
    const btn = document.getElementById('btn-animate');
    
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
        btn.textContent = '▶ Play';
        return;
    }
    
    btn.textContent = '⏸ Pause';
    let lead = 1;
    const slider = document.getElementById('slider-lead');
    
    animationInterval = setInterval(() => {
        slider.value = lead;
        updateLeadDay(lead);
        
        lead++;
        if (lead > 14) {
            clearInterval(animationInterval);
            animationInterval = null;
            btn.textContent = '▶ Play';
        }
    }, 800);
}

function setStatus(text) {
    document.getElementById('status-text').textContent = text;
}
