/* ═══════════════════════════════════════════════════════════════
   CryoNav Formatters
   Date, coordinate, unit, and display formatting utilities
   ═══════════════════════════════════════════════════════════════ */

import { format, formatDistanceToNow, parseISO } from 'date-fns';

/* ── Date/Time ──────────────────────────────────────────────── */

/**
 * Format a date as YYYY-MM-DD
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDate(date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd');
}

/**
 * Format a date as DD MMM YYYY, HH:mm UTC
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDateTime(date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, "dd MMM yyyy, HH:mm") + ' UTC';
}

/**
 * Format as relative time (e.g. "3 hours ago")
 * @param {Date|string} date
 * @returns {string}
 */
export function formatRelativeTime(date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Format as compact date for timeline labels (e.g. "Jan 20")
 * @param {Date|string} date
 * @returns {string}
 */
export function formatCompactDate(date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM dd');
}

/* ── Coordinates ────────────────────────────────────────────── */

/**
 * Format latitude as string with N/S suffix
 * @param {number} lat - Latitude in decimal degrees
 * @param {number} [precision=4] - Decimal places
 * @returns {string}
 */
export function formatLat(lat, precision = 4) {
  const dir = lat >= 0 ? 'N' : 'S';
  return `${Math.abs(lat).toFixed(precision)}°${dir}`;
}

/**
 * Format longitude as string with E/W suffix
 * @param {number} lon - Longitude in decimal degrees
 * @param {number} [precision=4] - Decimal places
 * @returns {string}
 */
export function formatLon(lon, precision = 4) {
  const dir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lon).toFixed(precision)}°${dir}`;
}

/**
 * Format a lat/lon pair as a compact string
 * @param {number} lat
 * @param {number} lon
 * @returns {string}
 */
export function formatCoords(lat, lon) {
  return `${formatLat(lat, 2)}, ${formatLon(lon, 2)}`;
}

/* ── Units ──────────────────────────────────────────────────── */

/**
 * Format distance in nautical miles
 * @param {number} nm - Distance in nautical miles
 * @returns {string}
 */
export function formatDistance(nm) {
  if (nm < 1) return `${(nm * 1852).toFixed(0)} m`;
  return `${nm.toFixed(1)} nm`;
}

/**
 * Format speed in knots
 * @param {number} knots
 * @returns {string}
 */
export function formatSpeed(knots) {
  return `${knots.toFixed(1)} kn`;
}

/**
 * Format duration in hours to a readable string
 * @param {number} hours
 * @returns {string}
 */
export function formatDuration(hours) {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)} hrs`;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  return `${days}d ${remainingHours}h`;
}

/**
 * Format fuel consumption in metric tons
 * @param {number} tons
 * @returns {string}
 */
export function formatFuel(tons) {
  if (tons < 1) return `${(tons * 1000).toFixed(0)} kg`;
  return `${tons.toFixed(1)} MT`;
}

/**
 * Format temperature in Celsius
 * @param {number} celsius
 * @returns {string}
 */
export function formatTemperature(celsius) {
  return `${celsius.toFixed(1)}°C`;
}

/**
 * Format wind speed
 * @param {number} ms - Speed in m/s
 * @returns {string}
 */
export function formatWindSpeed(ms) {
  return `${ms.toFixed(1)} m/s`;
}

/**
 * Format percentage
 * @param {number} value - Value 0–100
 * @param {number} [decimals=0]
 * @returns {string}
 */
export function formatPercent(value, decimals = 0) {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a large number with k/M suffix
 * @param {number} value
 * @returns {string}
 */
export function formatCompactNumber(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toString();
}

/* ── Risk ───────────────────────────────────────────────────── */

/**
 * Get the risk level label for an ANRI value
 * @param {number} anri - ANRI 0–100
 * @returns {string}
 */
export function formatRiskLevel(anri) {
  if (anri <= 25) return 'LOW';
  if (anri <= 50) return 'MODERATE';
  if (anri <= 75) return 'HIGH';
  return 'CRITICAL';
}

/* ── Data Quality ───────────────────────────────────────────── */

/**
 * Format data quality status
 * @param {boolean} isReal
 * @returns {{ label: string, className: string }}
 */
export function formatDataQuality(isReal) {
  if (isReal === true) return { label: 'Real', className: 'real' };
  if (isReal === false) return { label: 'Synthetic', className: 'synthetic' };
  return { label: 'Unknown', className: 'unavailable' };
}
