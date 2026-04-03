import React, { useState } from 'react';

const DeckToggle = ({ isPublic, onToggle }) => {
  const [flashing, setFlashing] = useState(false);

  const handleToggle = (e) => {
    e.stopPropagation();
    setFlashing(true);
    onToggle();
    setTimeout(() => setFlashing(false), 300);
  };

  return (
    <button
      className={`deck-toggle ${isPublic ? 'deck-toggle-public' : 'deck-toggle-private'} ${flashing ? 'deck-toggle-flash' : ''}`}
      onClick={handleToggle}
      aria-label={isPublic ? 'Build is public on your deck. Click to make private.' : 'Build is private. Click to add to your deck.'}
    >
      <span className="deck-toggle-label">
        {isPublic ? 'PUBLIC' : 'PRIVATE'}
      </span>
    </button>
  );
};

export default DeckToggle;
