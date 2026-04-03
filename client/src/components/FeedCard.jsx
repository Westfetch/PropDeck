import React from 'react';
import LikeButton from './LikeButton.jsx';
import { timeAgo } from '../demoData.js';

const TRADE_BADGES = {
  for_sale: { label: 'For sale', className: 'trade-badge-for-sale' },
  for_swap: { label: 'For swap', className: 'trade-badge-for-swap' }
};

const TYPE_ICONS = {
  '65mm 1S whoop': '65',
  '65mm 1S freestyle whoop': '65',
  '75mm 1S whoop': '75',
  '75mm 2S whoop': '75',
  '75mm HD micro': 'HD',
  '2-inch micro': '2"',
  '3-inch cinewhoop': '3"',
  '3.5-inch cinewhoop': '3.5"',
  '5-inch freestyle': '5"'
};

const FeedCard = ({ build, pilot, liked, onLike, onClick }) => {
  const partCount = build.parts?.length || 0;
  const hasFlightProof = !!(build.flight_proof_media && build.flight_proof_media.yt_url);
  const isLost = build.lifecycle_status === 'lost';
  const isStripped = build.lifecycle_status === 'stripped';
  const tradeBadge = TRADE_BADGES[build.lifecycle_status];
  const isVerified = pilot.badges?.includes('verified_pilot') || false;
  const typeIcon = TYPE_ICONS[build.build_name] || '?';

  const cardClass = [
    'feed-card',
    isLost ? 'feed-card-rip' : '',
    isStripped ? 'feed-card-stripped' : ''
  ].filter(Boolean).join(' ');

  return (
    <article className={cardClass} onClick={onClick} role="link" tabIndex={0}>
      <div className="feed-card-photo">
        {build.photo_url ? (
          <img src={build.photo_url} alt={build.model_label || build.build_name} className="feed-card-photo-img" />
        ) : (
          <div className="feed-card-photo-placeholder">
            <span className="feed-card-type-icon">{typeIcon}</span>
          </div>
        )}
        {tradeBadge && (
          <span className={`feed-card-badge ${tradeBadge.className}`}>{tradeBadge.label}</span>
        )}
        {isLost && (
          <div className="feed-card-rip-overlay">
            <span className="feed-card-rip-stamp">RIP</span>
          </div>
        )}
      </div>

      <div className="feed-card-body">
        <div className="feed-card-pilot-row">
          <div className="feed-card-avatar" style={{ background: pilot.colour }}>
            {pilot.initials}
          </div>
          <span className="feed-card-pilot-name">
            {pilot.username}{isVerified ? ' *' : ''}
          </span>
          {hasFlightProof && <span className="feed-card-proof-inline">flight proof</span>}
        </div>

        <h3 className="feed-card-title">{build.model_label || build.build_name}</h3>

        {build.note && (
          <p className="feed-card-note">{build.note}</p>
        )}

        <div className="feed-card-meta">
          <span>{build.build_name}</span>
          <span>{partCount} parts</span>
          {build.created_at && <span>{timeAgo(build.created_at)}</span>}
        </div>

        <div className="feed-card-actions">
          <LikeButton
            count={build.likes + (liked ? 1 : 0)}
            liked={liked}
            onToggle={onLike}
            small
          />
          {build.lifecycle_status === 'for_sale' && build.sale_price_gbp && (
            <span className="feed-card-price">£{build.sale_price_gbp}</span>
          )}
        </div>
      </div>
    </article>
  );
};

export default FeedCard;
