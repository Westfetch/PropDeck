import React, { useState } from 'react';
import EditProfileModal from './EditProfileModal.jsx';

const BADGE_LABELS = {
  verified_pilot: 'Verified pilot',
  swapper: 'Swapper'
};

const PilotProfile = ({ pilot, onProfileUpdate }) => {
  const [editing, setEditing] = useState(false);

  if (!pilot) return null;

  const initials = (pilot.username || '?').slice(0, 2).toUpperCase();

  return (
    <div className="pilot-profile">
      <div className="pilot-profile-top">
        <div className="pilot-avatar" style={{ background: pilot.avatar_colour || '#d26cff' }}>
          {initials}
        </div>
        <div className="pilot-info">
          <h2 className="pilot-username">{pilot.username}</h2>
          {pilot.bio && <p className="pilot-bio">{pilot.bio}</p>}
        </div>
        {onProfileUpdate && (
          <button className="btn btn-ghost pilot-edit-btn" onClick={() => setEditing(true)}>
            Edit profile
          </button>
        )}
      </div>

      <div className="pilot-stats-row">
        <div className="pilot-stat">
          <span className="pilot-stat-value">{pilot.stats?.quads || 0}</span>
          <span className="pilot-stat-label">quads</span>
        </div>
        <div className="pilot-stat">
          <span className="pilot-stat-value stat-accent">{pilot.stats?.likes || 0}</span>
          <span className="pilot-stat-label">likes</span>
        </div>
        <div className="pilot-stat">
          <span className="pilot-stat-value">{pilot.stats?.swaps || 0}</span>
          <span className="pilot-stat-label">swaps</span>
        </div>
      </div>

      {pilot.badges?.length > 0 && (
        <div className="pilot-badges">
          {pilot.badges.map((badge) => (
            <span key={badge} className={`badge badge-${badge}`}>
              {BADGE_LABELS[badge] || badge}
            </span>
          ))}
        </div>
      )}

      {editing && (
        <EditProfileModal
          profile={pilot}
          onSave={(updated) => { onProfileUpdate(updated); setEditing(false); }}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
};

export default PilotProfile;
