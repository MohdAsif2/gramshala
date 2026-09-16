/**
 * src/components/SlidePlayer.jsx
 * Mode 2 (3G): Audio Stream + Synced Slides
 */

import React from 'react';
import './Players.css';

export default function SlidePlayer({ audioUrl, activeSlide, title }) {
 
  return (
    <div className="player-card slide-player-container">
      <div className="player-header">
        <span className="mode-badge-tag audio-tag">3G Active (Audio + Slides)</span>
        <h2 className="lesson-heading">{title || 'Synchronized Classroom Slides'}</h2>
      </div>

      <div className="player-viewport slide-viewport">
        {activeSlide?.imageUrl ? (
          <div className="slide-image-wrapper">
            <img
              src={activeSlide.imageUrl}
              alt={'Loading...'}
              className="slide-image"
              loading="lazy"
            />
            <div className="slide-overlay-info">
              <span className="slide-counter">Slide {activeSlide.pageNumber || 1}</span>
              <p className="slide-overlay-caption">{activeSlide.caption}</p>
            </div>
          </div>
        ) : (
          <div className="player-fallback">
            <p>⏳ Syncing slide with teacher's audio broadcast...</p>
          </div>
        )}
      </div>

      {/* Audio Stream Control Bar */}
      <div className="audio-control-bar">
        <div className="audio-meta">
          <span className="audio-icon">🎙️</span>
          <div>
            <strong className="audio-title">Live Teacher Audio</strong>
            <p className="audio-sub">Low-bitrate compressed voice stream (24 kbps)</p>
          </div>
        </div>
        {audioUrl && (
          <audio
            src={audioUrl}
            controls
            autoPlay
            className="native-audio-player"
          />
        )}
      </div>
    </div>
  );
}