/* ═══════════════════════════════════════════════════════════════
   CryoNav API Client — Base HTTP client
   Centralized error handling, request/response interceptors
   ═══════════════════════════════════════════════════════════════ */

import axios from 'axios';
import { toast } from 'sonner';
import { API_BASE_URL } from '@utils/constants';

/**
 * Axios instance configured for CryoNav API.
 * All service modules import this client instead of using raw fetch/axios.
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/* ── Request Interceptor ────────────────────────────────────── */
apiClient.interceptors.request.use(
  (config) => {
    // Add request timestamp for latency tracking
    config.metadata = { startTime: Date.now() };
    return config;
  },
  (error) => Promise.reject(error)
);

/* ── Response Interceptor ───────────────────────────────────── */
apiClient.interceptors.response.use(
  (response) => {
    // Log latency in dev mode
    if (import.meta.env.DEV && response.config.metadata) {
      const latency = Date.now() - response.config.metadata.startTime;
      console.debug(`[API] ${response.config.method?.toUpperCase()} ${response.config.url} — ${latency}ms`);
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.detail || error.message || 'Unknown error';
    const url = error.config?.url || 'unknown';

    // User-facing error toasts
    if (status === 404) {
      toast.error(`Resource not found: ${url}`);
    } else if (status === 422) {
      toast.error(`Validation error: ${message}`);
    } else if (status === 500) {
      toast.error(`Server error: ${message}`);
    } else if (status === 503) {
      toast.warning('Service temporarily unavailable. Retrying...');
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timed out. The server may be processing heavy data.');
    } else if (!error.response) {
      toast.error('Network error. Check your connection to the CryoNav backend.');
    }

    console.error(`[API Error] ${status || 'NETWORK'} ${url}: ${message}`);
    return Promise.reject(error);
  }
);

export default apiClient;
