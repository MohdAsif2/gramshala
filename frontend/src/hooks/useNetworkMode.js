/**
 * src/hooks/useNetworkMode.js
 * Stabilized network hook with hysteresis and anti-flapping controls.
 */

import { useState, useEffect, useRef } from 'react';
import { measureBandwidth } from '../services/bandwidthService';
import { MODES, NETWORK_THRESHOLDS } from '../config/networkConfig';

export function useNetworkMode() {
  const [mode, setMode] = useState(MODES.VIDEO);
  const [speedKbps, setSpeedKbps] = useState(3000);
  const [latencyMs, setLatencyMs] = useState(50);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [isManualOverride, setIsManualOverride] = useState(false);

  // Persistence refs to prevent re-render trigger loops
  const isMeasuringRef = useRef(false);
  const modeRef = useRef(MODES.VIDEO);
  const isManualOverrideRef = useRef(false);
  const smoothedSpeedRef = useRef(3000);
  const upgradeCandidatesRef = useRef(0);
  const lastSwitchTimeRef = useRef(Date.now());

  // Keep refs in sync with React state
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    isManualOverrideRef.current = isManualOverride;
  }, [isManualOverride]);

  /**
   * Evaluates speed against hysteresis bands and applies cooldown rules
   */
  const evaluateModeTransition = (currentMode, rawSpeed) => {
    // 1. Exponential Moving Average (EMA): 40% new sample, 60% historical
    smoothedSpeedRef.current = Math.round(
      0.4 * rawSpeed + 0.6 * smoothedSpeedRef.current
    );
    const effectiveSpeed = smoothedSpeedRef.current;
    const now = Date.now();
    const timeSinceLastSwitch = now - lastSwitchTimeRef.current;

    let targetMode = currentMode;

    // 2. DOWNGRADE CHECKS (Immediate reaction to avoid buffer starvation)
    if (currentMode === MODES.VIDEO && effectiveSpeed < NETWORK_THRESHOLDS.VIDEO_DOWNGRADE) {
      targetMode = effectiveSpeed >= NETWORK_THRESHOLDS.AUDIO_UPGRADE ? MODES.AUDIO : MODES.TEXT;
      upgradeCandidatesRef.current = 0;
    } else if (currentMode === MODES.AUDIO && effectiveSpeed < NETWORK_THRESHOLDS.AUDIO_DOWNGRADE) {
      targetMode = MODES.TEXT;
      upgradeCandidatesRef.current = 0;
    } 
    // 3. UPGRADE CHECKS (Conservative: requires 2 consecutive good readings & 10s cooldown)
    else if (currentMode === MODES.TEXT && effectiveSpeed >= NETWORK_THRESHOLDS.AUDIO_UPGRADE) {
      upgradeCandidatesRef.current += 1;
      if (upgradeCandidatesRef.current >= 2 && timeSinceLastSwitch > 10000) {
        targetMode = effectiveSpeed >= NETWORK_THRESHOLDS.VIDEO_UPGRADE ? MODES.VIDEO : MODES.AUDIO;
        upgradeCandidatesRef.current = 0;
      }
    } else if (currentMode === MODES.AUDIO && effectiveSpeed >= NETWORK_THRESHOLDS.VIDEO_UPGRADE) {
      upgradeCandidatesRef.current += 1;
      if (upgradeCandidatesRef.current >= 2 && timeSinceLastSwitch > 10000) {
        targetMode = MODES.VIDEO;
        upgradeCandidatesRef.current = 0;
      }
    } else {
      // Speed is stable within current threshold
      upgradeCandidatesRef.current = 0;
    }

    if (targetMode !== currentMode) {
      lastSwitchTimeRef.current = now;
      return targetMode;
    }

    return currentMode;
  };

  /**
   * Performs an isolated network measurement without recreating hook state
   */
  const runSpeedCheck = async () => {
    if (isMeasuringRef.current) return;

    isMeasuringRef.current = true;
    setIsMeasuring(true);

    try {
      const result = await measureBandwidth();
      setSpeedKbps(result.speedKbps);
      setLatencyMs(result.latencyMs);

      if (!isManualOverrideRef.current) {
        const nextMode = evaluateModeTransition(modeRef.current, result.speedKbps);
        if (nextMode !== modeRef.current) {
          setMode(nextMode);
        }
      }
    } catch (err) {
      console.warn('Network probe error:', err);
    } finally {
      isMeasuringRef.current = false;
      setIsMeasuring(false);
    }
  };

  const setManualMode = (targetMode) => {
    if (targetMode === 'auto') {
      setIsManualOverride(false);
      isManualOverrideRef.current = false;
      upgradeCandidatesRef.current = 0;
      runSpeedCheck();
    } else {
      setIsManualOverride(true);
      isManualOverrideRef.current = true;
      setMode(targetMode);
    }
  };

  useEffect(() => {
    // 1. Initial measurement on boot
    runSpeedCheck();

    // 2. Poll every 25 seconds (steady interval, non-aggressive)
    const intervalId = setInterval(runSpeedCheck, 25000);

    // 3. Native Network Event Listeners
    const handleOffline = () => {
      setMode(MODES.TEXT);
      setSpeedKbps(0);
      setLatencyMs(Infinity);
    };

    const handleOnline = () => {
      runSpeedCheck();
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return {
    mode,
    speedKbps,
    latencyMs,
    isMeasuring,
    isManualOverride,
    setManualMode,
    checkSpeedNow: runSpeedCheck
  };
}