import React, { useState } from 'react';

const HeartIcon = ({ filled }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const LikeButton = ({ count, liked, onToggle, small }) => {
  const [animating, setAnimating] = useState(false);

  const handleClick = (e) => {
    e.stopPropagation();
    setAnimating(true);
    onToggle();
    setTimeout(() => setAnimating(false), 200);
  };

  return (
    <button
      className={`like-btn ${liked ? 'like-btn-liked' : ''} ${small ? 'like-btn-small' : ''} ${animating ? 'like-btn-pop' : ''}`}
      onClick={handleClick}
      aria-label={liked ? `Unlike (${count} likes)` : `Like (${count} likes)`}
      aria-pressed={liked}
    >
      <HeartIcon filled={liked} />
      <span className="like-count">{count}</span>
    </button>
  );
};

export default LikeButton;
