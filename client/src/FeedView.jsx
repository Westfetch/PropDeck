import React, { useState, useMemo } from 'react';
import FeedCard from './components/FeedCard.jsx';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'for_sale', label: 'For sale' },
  { key: 'for_swap', label: 'For swap' },
  { key: 'lost', label: 'RIP' }
];

const FeedView = ({ builds, likeCounts, myLikes, onLikeBuild, onSelectBuild }) => {
  const [filter, setFilter] = useState('all');

  const filteredBuilds = useMemo(() => {
    if (filter === 'all') return builds;
    return builds.filter(b => b.lifecycle_status === filter);
  }, [builds, filter]);

  const counts = useMemo(() => {
    const c = {};
    for (const f of FILTERS) {
      c[f.key] = f.key === 'all'
        ? builds.length
        : builds.filter(b => b.lifecycle_status === f.key).length;
    }
    return c;
  }, [builds]);

  return (
    <div className="feed-view">
      <div className="feed-header">
        <h1 className="feed-title">Feed</h1>
        <p className="feed-subtitle">Recent quads from the community</p>
      </div>

      <div className="feed-filters">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`feed-filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {counts[f.key] > 0 && <span className="feed-filter-count">{counts[f.key]}</span>}
          </button>
        ))}
      </div>

      <div className="feed-grid">
        {filteredBuilds.map((build) => {
          // Profile comes from the Supabase join (profiles table)
          const pilot = build.profiles || {
            username: 'unknown',
            avatar_colour: '#555',
            bio: null
          };
          const buildLikes = likeCounts[build.id]?.build || 0;
          const liked = !!myLikes.build[build.id];

          return (
            <FeedCard
              key={build.id}
              build={{ ...build, likes: buildLikes }}
              pilot={{ ...pilot, initials: (pilot.username || '?').slice(0, 2).toUpperCase(), badges: [] }}
              liked={liked}
              onLike={() => onLikeBuild(build.id)}
              onClick={() => onSelectBuild(build)}
            />
          );
        })}
      </div>

      {filteredBuilds.length === 0 && (
        <p className="feed-empty">
          {filter === 'all'
            ? 'No public quads yet. Add a quad to your garage and make it public.'
            : `No ${FILTERS.find(f => f.key === filter)?.label.toLowerCase()} quads.`}
        </p>
      )}
    </div>
  );
};

export default FeedView;
