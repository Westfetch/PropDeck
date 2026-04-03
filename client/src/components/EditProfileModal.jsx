import React, { useState } from 'react';
import { updateProfile } from '../db.js';

const COLOURS = ['#d26cff', '#ff7ecb', '#60d394', '#6495ed', '#ffb86c', '#ff5050', '#50c8e8', '#c8a0ff'];

const EditProfileModal = ({ profile, onSave, onClose }) => {
  const [username, setUsername] = useState(profile.username || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [colour, setColour] = useState(profile.avatar_colour || '#d26cff');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!username.trim() || username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setSaving(true);
    setError('');

    const updated = await updateProfile(profile.id, {
      username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
      bio: bio.trim() || null,
      avatar_colour: colour
    });

    if (updated) {
      onSave(updated);
    } else {
      setError('Failed to save. Username might already be taken.');
    }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Edit profile</h3>

        <label className="form-label">
          Username
          <input
            type="text"
            className="form-input"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="e.g. whoop_ripper"
          />
        </label>

        <label className="form-label">
          Bio
          <input
            type="text"
            className="form-input"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A line about you"
            maxLength={120}
          />
        </label>

        <div className="form-label">
          Colour
          <div className="colour-picker">
            {COLOURS.map(c => (
              <button
                key={c}
                className={`colour-swatch ${c === colour ? 'colour-swatch-active' : ''}`}
                style={{ background: c }}
                onClick={() => setColour(c)}
                aria-label={`Select colour ${c}`}
              />
            ))}
          </div>
        </div>

        <div className="colour-preview">
          <div className="pilot-avatar" style={{ background: colour }}>
            {(username || '?').slice(0, 2).toUpperCase()}
          </div>
          <span className="muted">{username || 'username'}</span>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
