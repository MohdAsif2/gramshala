/**
 * src/App.jsx
 * Master classroom coordinator for Gramshala.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNetworkMode } from './hooks/useNetworkMode';
import { API_BASE_URL, MODES } from './config/networkConfig';
import { SocketService } from './services/SocketService';

import NetworkStatusBar from './components/NetworkStatus';
import VideoPlayer from './components/VideoPlayer';
import SlidePlayer from './components/SlidePlayer';
import TextPlayer from './components/TextPlayer';

import './components/Players.css';
import './App.css';

export default function App() {
  // 1. Telemetry & Network Mode Hook
  const {
    mode,
    speedKbps,
    latencyMs,
    isMeasuring,
    isManualOverride,
    setManualMode,
    checkSpeedNow
  } = useNetworkMode();

  // 2. Local Classroom State
  const [lessonData, setLessonData] = useState(null);
  const [activeSlide, setActiveSlide] = useState(null);
  const [liveCaptions, setLiveCaptions] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [isLoadingLesson, setIsLoadingLesson] = useState(true);

  const socketServiceRef = useRef(null);

  // 3. Mode-Filtered REST Fetch
  useEffect(() => {
    let isMounted = true;
    setIsLoadingLesson(true);

    async function fetchLessonPayload() {
      try {
        const response = await fetch(`${API_BASE_URL}/lessons/current?mode=${mode}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        if (isMounted) {
          setLessonData(data);
          // Set initial slide state if provided in payload
          if (data.slides && data.slides.length > 0) {
            setActiveSlide(data.slides[0]);
          }
          setIsLoadingLesson(false);
        }
      } catch (err) {
        console.error('Failed to load lesson metadata:', err);
        if (isMounted) setIsLoadingLesson(false);
      }
    }

    fetchLessonPayload();

    return () => {
      isMounted = false;
    };
  }, [mode]);

  // 4. WebSocket Stream Connection
  useEffect(() => {
    const handleSlideChange = (slide) => {
      setActiveSlide(slide);
    };

    const handleLiveCaption = (text) => {
      setLiveCaptions((prev) => [
        ...prev.slice(-40), // Keep buffer capped to last 40 lines to save RAM
        { text, timestamp: Date.now() }
      ]);
    };

    const handleStatusChange = (status) => {
      setConnectionStatus(status);
    };

    const socket = new SocketService(
      handleSlideChange,
      handleLiveCaption,
      handleStatusChange
    );

    socket.connect();
    socketServiceRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="app-container">
      {/* 📡 Live Network Telemetry Bar */}
      <NetworkStatusBar
        mode={mode}
        speedKbps={speedKbps}
        latencyMs={latencyMs}
        isMeasuring={isMeasuring}
        isManualOverride={isManualOverride}
        setManualMode={setManualMode}
        checkSpeedNow={checkSpeedNow}
      />

      {/* 🎓 Main Classroom Display */}
      <main className="classroom-main">
        {connectionStatus === 'reconnecting' && (
          <div className="reconnect-banner">
            ⚠️ Connection degraded. Retrying WebSocket stream (offline cache active)...
          </div>
        )}

        {isLoadingLesson ? (
          <div className="loading-container">
            <div className="spinner" />
            <p>Optimizing payload for <strong>{mode.toUpperCase()}</strong> tier...</p>
          </div>
        ) : (
          <div className="player-stage">
            {/* Mode 1: 4G / 5G (HLS Video) */}
            {mode === MODES.VIDEO && (
              <VideoPlayer
                videoUrl={lessonData?.videoUrl}
                poster={lessonData?.poster}
                title={lessonData?.title}
              />
            )}

            {/* Mode 2: 3G (Audio Stream + Synced Slides) */}
            {mode === MODES.AUDIO && (
              <SlidePlayer
                audioUrl={lessonData?.audioUrl}
                activeSlide={activeSlide}
                title={lessonData?.title}
              />
            )}

            {/* Mode 3: 2G (Ultra-Light Text & Real-Time Transcript) */}
            {mode === MODES.TEXT && (
              <TextPlayer
                activeSlide={activeSlide}
                liveCaptions={liveCaptions}
                title={lessonData?.title}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}