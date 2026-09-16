/**
 * src/components/VideoPlayer.jsx
 */

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import './Players.css';

export default function VideoPlayer({ videoUrl, transcripts = [], title }) {
  const videoRef = useRef(null);
  const [streamStatus, setStreamStatus] = useState('Initializing player...');
  const [hasError, setHasError] = useState(false);

  // 🛡️ Safely resolve activeUrl to a pure string
  const resolvedUrl = typeof videoUrl === 'string' 
    ? videoUrl 
    : (videoUrl?.url || videoUrl?.videoUrl || '');
console.log(resolvedUrl)
   
  const activeUrl = resolvedUrl || ''
  // 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';


  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeUrl) return;

    let hls = null;
    setHasError(false);
    setStreamStatus('Connecting to stream...');

    // Now guaranteed to be a string
    const isHLS = typeof activeUrl === 'string' && activeUrl.includes('.m3u8');

    if (isHLS) {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90
        });

        hls.loadSource(activeUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setStreamStatus('Playing (HLS Active)');
          video.play().catch((err) => {
            console.warn('Autoplay blocked:', err);
            setStreamStatus('Click Play to start stream');
          });
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS error:', data);
          if (data.fatal) {
            setHasError(true);
            setStreamStatus(`Stream error: ${data.details}`);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = activeUrl;
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(() => setStreamStatus('Click Play to start stream'));
        });
      } else {
        setHasError(true);
        setStreamStatus('HLS unsupported in this browser');
      }
    } else {
      video.src = activeUrl;
      video.load();
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [activeUrl]);

  return (
    <div className="player-card video-player-container">
      <div className="player-header">
        <span className="mode-badge-tag video-tag">4G / 5G Active (Video)</span>
        <h2 className="lesson-heading">{title || 'Live Video Classroom'}</h2>
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#94a3b8' }}>
          {streamStatus}
        </span>
      </div>

      <div className="player-viewport video-viewport">
        {hasError ? (
          <div className="player-fallback">
            <p>⚠️ Unable to load stream from: <code>{String(activeUrl)}</code></p>
          </div>
        ) : (
          <video
            ref={videoRef}
            controls
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              backgroundColor: '#000'
            }}
          />
        )}
      </div>
    </div>
  );
}