import React, { useState, useMemo, useEffect } from 'react';
import BuildStatusBadge from './components/BuildStatusBadge.jsx';
import BuildPartsGrid from './components/BuildPartsGrid.jsx';
import FlightProofEmbed from './components/FlightProofEmbed.jsx';
import AddBuildForm from './components/AddBuildForm.jsx';
import PilotProfile from './components/PilotProfile.jsx';
import LikeButton from './components/LikeButton.jsx';
import DeckToggle from './components/DeckToggle.jsx';
import SwapButton from './components/SwapButton.jsx';
import PhotoGrid from './components/PhotoGrid.jsx';
import { detectBuilds } from '../../lib/fpv/detect-builds.js';
import { evaluateExpertRules } from '../../lib/fpv/evaluate-rules.js';
import { estimateItemValue } from '../../lib/fpv/swap-engine.js';
import BuildWarnings from './components/BuildWarnings.jsx';
import { fetchBuildParts, uploadBuildPhoto } from './db.js';
import { BUILD_STATUSES } from './demoData.js';
import templates from '../../lib/fpv/build-templates.json';

const BuildCard = ({
  build, pilot, liked, likeCount, onLike, flightProofLiked, flightProofLikeCount,
  onLikeFlightProof, onUpdateBuild, isOwner
}) => {
  const [parts, setParts] = useState([]);
  const [partsLoaded, setPartsLoaded] = useState(false);

  useEffect(() => {
    if (build.id) {
      fetchBuildParts(build.id).then(p => { setParts(p); setPartsLoaded(true); });
    }
  }, [build.id]);

  const detection = useMemo(() => {
    if (!parts.length) return null;
    const results = detectBuilds(parts, templates);
    return results.find(r => r.build_name === build.build_name) || results[0];
  }, [parts, build.build_name]);

  const totalValue = useMemo(() => {
    return parts.reduce((sum, part) => sum + estimateItemValue(part), 0);
  }, [parts]);

  const isLost = build.lifecycle_status === 'lost';
  const isStripped = build.lifecycle_status === 'stripped';
  const isForSale = build.lifecycle_status === 'for_sale';
  const isForSwap = build.lifecycle_status === 'for_swap';
  const isDead = isLost || isStripped;

  const ruleResults = useMemo(() => {
    if (!parts.length) return { warnings: [], tips: [] };
    return evaluateExpertRules(parts);
  }, [parts]);

  const missingParts = detection
    ? [...(detection.missing_required || []), ...(detection.missing_hidden_or_integrated || [])]
    : [];

  return (
    <article className={`build-card-v2 ${isLost ? 'build-card-rip' : ''}`}>
      <div style={{ position: 'relative' }}>
        <PhotoGrid
          photoUrl={build.photo_url}
          canEdit={isOwner}
          onUpload={async (file) => {
            const url = await uploadBuildPhoto(build.user_id, build.id, file);
            if (url) onUpdateBuild(build.id, { photo_url: url });
          }}
        />
        {isLost && (
          <div className="build-card-rip-overlay">
            <span className="build-card-rip-stamp">RIP</span>
          </div>
        )}
      </div>

      <div className="build-title-bar">
        <div className="build-title-left">
          <h2 className="build-title-v2">
            {build.model_label || build.build_name}
          </h2>
          {build.model_label && (
            <span className="build-template-label">{build.build_name}</span>
          )}
        </div>
        <div className="build-title-right">
          {isOwner && !isDead && (
            <DeckToggle
              isPublic={build.visibility === 'public'}
              onToggle={() => onUpdateBuild(build.id, {
                visibility: build.visibility === 'public' ? 'private' : 'public'
              })}
            />
          )}
          {detection && <BuildStatusBadge status={detection.status} />}
        </div>
      </div>

      <div className="build-meta-line">
        {pilot && (
          <span className="build-meta-pilot">
            <span className="build-meta-avatar" style={{ background: pilot.avatar_colour || '#555' }}>
              {(pilot.username || '?').slice(0, 2).toUpperCase()}
            </span>
            {pilot.username}
          </span>
        )}
        <span>{parts.length} parts</span>
        {totalValue > 0 && <span>£{totalValue.toFixed(0)} est.</span>}
      </div>

      {isOwner && (
        <div className="status-selector">
          <span className="status-selector-label">Status</span>
          <select
            className="status-select"
            value={build.lifecycle_status || 'flying'}
            onChange={(e) => onUpdateBuild(build.id, { lifecycle_status: e.target.value })}
          >
            {Object.entries(BUILD_STATUSES).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      )}

      {isOwner && isForSale && (
        <div className="sale-price-row">
          <span className="sale-price-label">Price</span>
          <input
            type="number"
            className="sale-price-input"
            placeholder="£"
            value={build.sale_price_gbp || ''}
            onChange={(e) => onUpdateBuild(build.id, { sale_price_gbp: Number(e.target.value) || null })}
          />
        </div>
      )}

      {isDead && (build.rip_note || build.note) && (
        <div className="rip-note">{build.rip_note || build.note}</div>
      )}

      <div className="build-actions-bar">
        <LikeButton
          count={likeCount}
          liked={liked}
          onToggle={onLike}
        />
        {!isOwner && isForSwap && <SwapButton />}
        {!isOwner && isForSale && build.sale_price_gbp && (
          <span className="feed-card-price">£{build.sale_price_gbp}</span>
        )}
      </div>

      {partsLoaded && !isDead && ruleResults.warnings.length > 0 && (
        <BuildWarnings warnings={ruleResults.warnings} tips={[]} />
      )}

      {partsLoaded && (
        <div className="build-section">
          <h3 className="build-section-label">
            Parts{isDead ? ` (${isLost ? 'at time of loss' : 'before strip'})` : ''}
          </h3>
          <BuildPartsGrid
            parts={parts}
            missingParts={isDead ? [] : missingParts}
            estimateValue={estimateItemValue}
            canEdit={isOwner}
            onPartPhotoUpload={async (partId, file) => {
              const url = await uploadPartPhoto(build.user_id, partId, file);
              if (url) setParts(prev => prev.map(p => p.id === partId ? { ...p, photo_url: url } : p));
            }}
          />
        </div>
      )}

      {!partsLoaded && (
        <div className="build-section">
          <p className="muted">Loading parts...</p>
        </div>
      )}

      {!isDead && (
        <div className="build-section">
          <div className="build-section-header">
            <h3 className="build-section-label">Flight proof</h3>
            {build.flight_proof_media && build.flight_proof_media.yt_url && (
              <LikeButton
                count={flightProofLikeCount}
                liked={flightProofLiked}
                onToggle={onLikeFlightProof}
                small
              />
            )}
          </div>
          <FlightProofEmbed
            flightProofMedia={build.flight_proof_media}
            onAddVideo={(url) => {
              const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
              if (!match) return;
              onUpdateBuild(build.id, {
                flight_proof_media: {
                  yt_url: url, yt_video_id: match[1], media_class: 'single_pack_flight',
                  duration_seconds: null, duration_validated: false, curation_pass: true,
                  curation_flags: [], flight_environment: 'unknown', source: 'user_supplied',
                  review_state: 'trusted_suggestion', notes: null
                }
              });
            }}
          />
        </div>
      )}
    </article>
  );
};

const BuildView = ({
  myBuilds, profile, user, onAddBuild, onUpdateBuild, onProfileUpdate,
  likeCounts, myLikes, onLikeBuild, onLikeFlightProof,
  selectedBuild, onBack
}) => {
  const [showAddForm, setShowAddForm] = useState(false);

  const pilotData = profile ? {
    username: profile.username,
    avatar_colour: profile.avatar_colour,
    bio: profile.bio,
    stats: { quads: myBuilds.length, likes: 0, swaps: 0 },
    badges: []
  } : null;

  if (selectedBuild) {
    const buildPilot = selectedBuild.profiles || profile || { username: 'unknown', avatar_colour: '#555' };
    const isOwner = selectedBuild.user_id === user.id;
    return (
      <div className="build-view">
        <button className="btn btn-ghost back-btn" onClick={onBack}>Back</button>
        <BuildCard
          build={selectedBuild}
          pilot={buildPilot}
          liked={!!myLikes.build[selectedBuild.id]}
          likeCount={likeCounts[selectedBuild.id]?.build || 0}
          onLike={() => onLikeBuild(selectedBuild.id)}
          flightProofLiked={!!myLikes.flight_proof[selectedBuild.id]}
          flightProofLikeCount={likeCounts[selectedBuild.id]?.flight_proof || 0}
          onLikeFlightProof={() => onLikeFlightProof(selectedBuild.id)}
          onUpdateBuild={onUpdateBuild}
          isOwner={isOwner}
        />
      </div>
    );
  }

  return (
    <div className="build-view">
      {pilotData && <PilotProfile pilot={pilotData} onProfileUpdate={onProfileUpdate} />}

      <div className="build-view-header">
        <h1 className="build-view-title">Garage</h1>
        <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancel' : '+ Add quad'}
        </button>
      </div>

      {showAddForm && (
        <AddBuildForm
          onAddBuild={(data) => { onAddBuild(data); setShowAddForm(false); }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {myBuilds.length === 0 && !showAddForm && (
        <p className="feed-empty">Your garage is empty. Add your first quad.</p>
      )}

      <div className="builds-list">
        {myBuilds.map((build) => (
          <BuildCard
            key={build.id}
            build={build}
            pilot={profile}
            liked={!!myLikes.build[build.id]}
            likeCount={likeCounts[build.id]?.build || 0}
            onLike={() => onLikeBuild(build.id)}
            flightProofLiked={!!myLikes.flight_proof[build.id]}
            flightProofLikeCount={likeCounts[build.id]?.flight_proof || 0}
            onLikeFlightProof={() => onLikeFlightProof(build.id)}
            onUpdateBuild={onUpdateBuild}
            isOwner={true}
          />
        ))}
      </div>
    </div>
  );
};

export default BuildView;
