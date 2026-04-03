import React, { useState } from 'react';

const extractVideoId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

const MEDIA_CLASS_LABELS = {
  single_pack_flight: 'Single pack flight',
  short_flight_edit: 'Short flight edit',
  raw_session: 'Raw session'
};

const FlightProofEmbed = ({ flightProofMedia, onAddVideo }) => {
  const [inputUrl, setInputUrl] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) return;
    if (!extractVideoId(trimmed)) {
      setError('Not a valid YouTube URL');
      return;
    }
    setError('');
    onAddVideo(trimmed);
    setInputUrl('');
  };

  if (!flightProofMedia || !flightProofMedia.yt_url) {
    return (
      <div className="flight-proof-empty">
        <div className="flight-proof-add-row">
          <input
            type="text"
            className={`flight-proof-input ${error ? 'flight-proof-input-error' : ''}`}
            placeholder="Paste a YouTube URL"
            value={inputUrl}
            onChange={(e) => { setInputUrl(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            aria-label="YouTube flight proof URL"
          />
          <button className="flight-proof-add-btn" onClick={handleAdd}>
            Add
          </button>
        </div>
        {error && <div className="flight-proof-error">{error}</div>}
      </div>
    );
  }

  const videoId = flightProofMedia.yt_video_id || extractVideoId(flightProofMedia.yt_url);
  if (!videoId) return null;

  const mediaLabel = MEDIA_CLASS_LABELS[flightProofMedia.media_class] || 'Flight proof';
  const duration = flightProofMedia.duration_seconds;
  const durationStr = duration ? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}` : null;

  return (
    <div className="flight-proof-container">
      <div className="flight-proof-header">
        <span className="flight-proof-label">{mediaLabel}</span>
        {durationStr && <span className="flight-proof-duration">{durationStr}</span>}
      </div>
      <div className="flight-proof-iframe-wrap">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title="Flight proof video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="flight-proof-iframe"
        />
      </div>
      {flightProofMedia.flight_environment && flightProofMedia.flight_environment !== 'unknown' && (
        <div className="flight-proof-meta">
          {flightProofMedia.flight_environment} flight
          {flightProofMedia.notes && ` — ${flightProofMedia.notes}`}
        </div>
      )}
    </div>
  );
};

export default FlightProofEmbed;
