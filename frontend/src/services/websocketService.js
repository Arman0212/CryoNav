/* ═══════════════════════════════════════════════════════════════
   WebSocket Service — Real-time channel management
   Connects to FastAPI WebSocket for live updates

   NOTE: Arman0212/CryoNav's backend (src/api/main.py) defines no
   @app.websocket route at all today — it's a plain request/response
   FastAPI app. This manager will attempt to connect, fail, and retry
   with backoff (capped at maxReconnectAttempts) until a WS route is
   added server-side; it's safe to leave wired up for that future work.
   ═══════════════════════════════════════════════════════════════ */

import { WS_URL } from '@utils/constants';

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.listeners = new Map();  // channel → Set<callback>
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.isIntentionallyClosed = false;
    this._onConnectionChange = null;
  }

  /**
   * Register a callback for connection state changes.
   * @param {function} callback - (isConnected: boolean) => void
   */
  onConnectionChange(callback) {
    this._onConnectionChange = callback;
  }

  /**
   * Connect to the WebSocket server.
   * Auto-reconnects with exponential backoff on disconnect.
   */
  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.isIntentionallyClosed = false;

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.info('[WS] Connected');
        this.reconnectAttempts = 0;
        this._onConnectionChange?.(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const { channel, payload, timestamp } = message;

          if (channel && this.listeners.has(channel)) {
            this.listeners.get(channel).forEach((callback) => {
              callback(payload, timestamp);
            });
          }
        } catch (err) {
          console.warn('[WS] Failed to parse message:', err);
        }
      };

      this.ws.onclose = () => {
        console.info('[WS] Disconnected');
        this._onConnectionChange?.(false);

        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
          console.info(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
          this.reconnectAttempts++;
          setTimeout(() => this.connect(), delay);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WS] Error:', error);
      };
    } catch (error) {
      console.error('[WS] Connection failed:', error);
    }
  }

  /**
   * Subscribe to a WebSocket channel.
   * @param {string} channel - Channel name (e.g., 'risk.change')
   * @param {function} callback - (payload, timestamp) => void
   * @returns {function} Unsubscribe function
   */
  subscribe(channel, callback) {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel).add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(channel)?.delete(callback);
      if (this.listeners.get(channel)?.size === 0) {
        this.listeners.delete(channel);
      }
    };
  }

  /**
   * Unsubscribe all callbacks from a channel.
   * @param {string} channel
   */
  unsubscribe(channel) {
    this.listeners.delete(channel);
  }

  /**
   * Send a message to the server.
   * @param {Object} message
   */
  send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[WS] Cannot send — not connected');
    }
  }

  /**
   * Cleanly close the connection.
   */
  disconnect() {
    this.isIntentionallyClosed = true;
    this.ws?.close();
    this.listeners.clear();
  }

  /** @returns {boolean} Whether the WebSocket is currently connected */
  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
const websocketService = new WebSocketManager();
export default websocketService;
