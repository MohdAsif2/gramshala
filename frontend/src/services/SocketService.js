/**
 * src/services/SocketService.js
 * Handles resilient WebSocket connections for low-bandwidth environments.
 */

import { WS_URL } from '../config/networkConfig';

export class SocketService {
  constructor(onSlideChange, onLiveCaption, onStatusChange) {
    this.ws = null;
    this.onSlideChange = onSlideChange;
    this.onLiveCaption = onLiveCaption;
    this.onStatusChange = onStatusChange; 

    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 30000;
    this.reconnectTimer = null;
    this.pingInterval = null;
    this.pongTimeout = null;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) return;

    if (this.onStatusChange) this.onStatusChange('reconnecting');
    
    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log('📡 Connected to Gramshala WebSocket stream');
      this.reconnectAttempts = 0;
      if (this.onStatusChange) this.onStatusChange('connected');
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      this.resetPongTimeout();
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'PONG') return;
        if (data.type === 'SLIDE_CHANGE' && this.onSlideChange) this.onSlideChange(data.slide);
        if (data.type === 'LIVE_CAPTION' && this.onLiveCaption) this.onLiveCaption(data.text);
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      if (this.onStatusChange) this.onStatusChange('offline');
      this.scheduleReconnect();
    };

    this.ws.onerror = () => this.ws.close();
  }

  scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay);
    const totalDelay = baseDelay + Math.floor(Math.random() * 1000);
    this.reconnectAttempts += 1;
    
    this.reconnectTimer = setTimeout(() => {
      if (navigator.onLine === false) {
        window.addEventListener('online', () => this.connect(), { once: true });
        return;
      }
      this.connect();
    }, totalDelay);
  }

  startHeartbeat() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
        this.pongTimeout = setTimeout(() => this.ws.close(), 5000);
      }
    }, 15000);
  }

  resetPongTimeout() {
    if (this.pongTimeout) clearTimeout(this.pongTimeout);
  }

  stopHeartbeat() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.pongTimeout) clearTimeout(this.pongTimeout);
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) this.ws.close();
  }
}