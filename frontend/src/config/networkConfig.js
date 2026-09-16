/**
 * src/config/networkConfig.js
 */

const BACKEND_DOMAIN = 'localhost:5000'; 

export const API_BASE_URL = `http://${BACKEND_DOMAIN}/api`;
export const WS_URL = `ws://${BACKEND_DOMAIN}`;
export const PROBE_URL = `http://${BACKEND_DOMAIN}/public/ping-probe.bin`;

export const MODES = {
  VIDEO: 'video',
  AUDIO: 'audio',
  TEXT: 'text'
};

// Hysteresis Bands (in Kbps) to eliminate boundary flapping
export const NETWORK_THRESHOLDS = {
  // 4G Video thresholds
  VIDEO_UPGRADE: 2400,    // Must reach > 2.4 Mbps to upgrade to video
  VIDEO_DOWNGRADE: 1700,  // Drops to 3G only if speed falls below 1.7 Mbps

  // 3G Audio thresholds
  AUDIO_UPGRADE: 600,     // Must reach > 600 Kbps to upgrade from text to audio
  AUDIO_DOWNGRADE: 350,   // Drops to 2G text only if speed falls below 350 Kbps
};