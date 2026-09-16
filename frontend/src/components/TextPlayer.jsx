/**
 * src/components/TextPlayer.jsx
 * Mode 3 (2G): Ultra-Low Bandwidth Text & Live Transcript Reader
 */

import React, { useEffect, useRef } from 'react';
import './Players.css';

export default function TextPlayer({ slides = [], transcripts = [], activeSlide, title }) {
  const currentSlide = activeSlide || (slides && slides[0]);

  return (
    <div className="player-card text-player-container">
      <div className="player-header">
        <span className="mode-badge-tag text-tag">2G (Data Saver / Full Text)</span>
        <h2 className="lesson-heading">{title}</h2>
      </div>

      <div className="text-player-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left Column: Slide Notes */}
        <section className="slide-notes-pane">
          <h3>📘 Slide Notes: {currentSlide?.title}</h3>
          <p>{currentSlide?.notes || 'No notes for this slide.'}</p>
          {currentSlide?.caption && (
            <div style={{ marginTop: '10px', color: '#38bdf8' }}>
              <strong>Takeaway:</strong> {currentSlide.caption}
            </div>
          )}
        </section>

        {/* Right Column: Audio Transcript */}
        <section className="transcript-pane" style={{ maxHeight: '350px', overflowY: 'auto' }}>
          <h3>📖 Audio Transcript</h3>
          {transcripts.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
              <p>🔄 Processing speech transcript from audio...</p>
              <span style={{ fontSize: '12px' }}>This only happens once per lesson.</span>
            </div>
          ) : (
            transcripts.map((cue, idx) => (
              <div key={idx} style={{ padding: '8px 0', borderBottom: '1px solid #334155' }}>
                <span style={{ color: '#38bdf8', fontSize: '12px', marginRight: '8px' }}>
                  [{Math.floor(cue.start / 60)}:{String(cue.start % 60).padStart(2, '0')}]
                </span>
                <span style={{ color: '#f8fafc', fontSize: '14px' }}>{cue.text}</span>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}