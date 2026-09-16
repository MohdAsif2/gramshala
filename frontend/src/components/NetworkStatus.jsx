/**
 * src/components/NetworkStatusBar.jsx
 * Real-time network telemetry bar with manual mode override selector.
 */

import React from 'react';
import { MODES } from '../config/networkConfig';
import './networkStatus.css';

export default function NetworkStatusBar({
  mode,
  speedKbps,
  latencyMs,
  isMeasuring,
  isManualOverride,
  setManualMode,
  checkSpeedNow
}) {
  // Format bandwidth readout
  const formattedSpeed = speedKbps >= 1000 
    ? `${(speedKbps / 1000).toFixed(1)} Mbps` 
    : `${speedKbps} Kbps`;

  // Get status badge metadata
  const getBadgeDetails = () => {
    switch (mode) {
      case MODES.VIDEO:
        return { label: '4G/5G (HD Video)', className: 'badge-video' };
      case MODES.AUDIO:
        return { label: '3G (Audio + Slides)', className: 'badge-audio' };
      case MODES.TEXT:
      default:
        return { label: '2G (Low Data / Text)', className: 'badge-text' };
    }
  };

  const badge = getBadgeDetails();

  return (
    <header className="network-status-bar">
      <div className="status-group left">
        <span className="brand-logo">🎓 Gramshala</span>
        <div className={`status-pill ${badge.className}`}>
          <span className="status-indicator-dot" />
          <span className="status-label">{badge.label}</span>
        </div>
      </div>

      <div className="status-group center">
        <span className="telemetry-item">
          <strong>Speed:</strong> {isMeasuring ? 'Testing...' : formattedSpeed}
        </span>
        <span className="telemetry-separator">•</span>
        <span className="telemetry-item">
          <strong>Latency:</strong> {latencyMs === Infinity ? 'Offline' : `${latencyMs} ms`}
        </span>
        <button 
          className="refresh-speed-btn" 
          onClick={checkSpeedNow} 
          disabled={isMeasuring}
          title="Re-test network bandwidth"
        >
          {isMeasuring ? '⏳' : '🔄'}
        </button>
      </div>

      <div className="status-group right">
        <label htmlFor="mode-select" className="mode-select-label">Mode:</label>
        <select
          id="mode-select"
          className="mode-dropdown"
          value={isManualOverride ? mode : 'auto'}
          onChange={(e) => setManualMode(e.target.value)}
        >
          <option value="auto">Auto (Adaptive)</option>
          <option value={MODES.VIDEO}>Force 4G (Video)</option>
          <option value={MODES.AUDIO}>Force 3G (Audio + Slides)</option>
          <option value={MODES.TEXT}>Force 2G (Data Saver / Text)</option>
        </select>
      </div>
    </header>
  );
}