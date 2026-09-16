/**
 * src/services/bandwidthService.js
 * Measures round-trip latency and throughput using a lightweight 10 KB probe.
 */

import { PROBE_URL, NETWORK_THRESHOLDS, MODES } from '../config/networkConfig';

const PROBE_SIZE_BYTES = 10 * 1024; // 10,240 bytes (exact size created by backend)
const PROBE_SIZE_BITS = PROBE_SIZE_BYTES * 8; // 81,920 bits
const TIMEOUT_MS = 6000; // Abort after 6s (sign of extremely degraded 2G)

/**
 * Executes a bandwidth test against the static probe file.
 * @returns {Promise<{ speedKbps: number, latencyMs: number, mode: string }>}
 */
export async function measureBandwidth() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      speedKbps: 0,
      latencyMs: Infinity,
      mode: MODES.TEXT
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // Cache-busting query parameter ensures fresh network transfer
  const cacheBusterUrl = `${PROBE_URL}?t=${Date.now()}`;

  const startTime = performance.now();

  try {
    const response = await fetch(cacheBusterUrl, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Probe fetch failed with status: ${response.status}`);
    }

    // Read full binary payload to ensure complete transmission
    await response.arrayBuffer();

    const endTime = performance.now();
    clearTimeout(timeoutId);

    const durationSeconds = (endTime - startTime) / 1000;
    const latencyMs = Math.round(endTime - startTime);

    // Calculate throughput in Kilobits per second (Kbps)
    const speedBps = PROBE_SIZE_BITS / durationSeconds;
    const speedKbps = Math.round(speedBps / 1000);

    const mode = determineMode(speedKbps);

    return {
      speedKbps,
      latencyMs,
      mode
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('⚠️ Bandwidth probe timed out or failed. Falling back to Text Mode.', error.message);

    return {
      speedKbps: 0,
      latencyMs: Infinity,
      mode: MODES.TEXT
    };
  }
}

/**
 * Maps throughput (Kbps) to Gramshala operating modes.
 * @param {number} speedKbps
 * @returns {string} 'video' | 'audio' | 'text'
 */
export function determineMode(speedKbps) {
  if (speedKbps >= NETWORK_THRESHOLDS.MODE_1_VIDEO) {
    return MODES.VIDEO;
  }
  if (speedKbps >= NETWORK_THRESHOLDS.MODE_2_AUDIO) {
    return MODES.AUDIO;
  }
  return MODES.TEXT;
}