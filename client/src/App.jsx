import React, { useCallback, useEffect, useMemo, useState } from 'react';
import BuildView from './BuildView.jsx';
import FeedView from './FeedView.jsx';
import Auth from './components/Auth.jsx';
import { supabase } from './supabase.js';
import SearchView from './SearchView.jsx';
import PropDeckLogo from './components/PropDeckLogo.jsx';
import * as db from './db.js';
import './deck.css';
import './feed.css';
import './search.css';

const API_URL = 'http://localhost:3001';

function ToolView() {
  const [image, setImage] = useState(null);
  const [detected, setDetected] = useState([]);
  const [scanContext, setScanContext] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [intelligence, setIntelligence] = useState(null);
  const [query, setQuery] = useState('0802 22000kv');
  const [searchData, setSearchData] = useState(null);

  const canSave = detected.length > 0;
  const inventoryValue = useMemo(() => intelligence?.value ?? 0, [intelligence]);

  async function handleScan() {
    const formData = new FormData();
    if (image) formData.append('image', image);
    const res = await fetch(`${API_URL}/scan`, { method: 'POST', body: formData });
    const data = await res.json();
    setDetected(data.detected || []);
    setScanContext(data.context || null);
  }

  async function handleSaveInventory() {
    const res = await fetch(`${API_URL}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: detected })
    });
    const data = await res.json();
    setInventory(data.inventory || []);
    await loadIntelligence();
  }

  async function loadInventory() {
    const res = await fetch(`${API_URL}/inventory`);
    setInventory(await res.json() || []);
  }

  async function loadIntelligence() {
    const res = await fetch(`${API_URL}/inventory/intelligence`);
    setIntelligence(await res.json());
  }

  async function handleSearch(term = query) {
    const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(term)}`);
    setSearchData(await res.json());
    setQuery(term);
  }

  function updateDetected(index, field, value) {
    setDetected((current) =>
      current.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  return (
    <main className="grid">
      <section className="panel">
        <h2>Scan your parts</h2>
        <p className="muted">Dump your FPV gear on a table and take a photo.</p>
        <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} />
        <div className="button-row">
          <button onClick={handleScan}>Scan parts</button>
          <button className="ghost" onClick={loadInventory}>Load inventory</button>
          <button className="ghost" onClick={loadIntelligence}>Analyse</button>
        </div>
        {scanContext && (
          <div className="context-box">
            <strong>Scan context</strong>
            <div>Motors: {scanContext.motorCount}</div>
            <div>Frame: {scanContext.hasFrame ? 'Yes' : 'No'}</div>
            <div>AIO: {scanContext.hasAIO ? 'Yes' : 'No'}</div>
          </div>
        )}
        <div className="card-stack">
          {detected.map((item, index) => (
            <article className="card" key={`${item.type}-${index}`}>
              <div className="card-head">
                <div>
                  <h3>{item.type}</h3>
                  <p>{item.guess || item.name || 'Unknown part'}</p>
                </div>
                <span className="badge">{item.confidence || 'raw'}</span>
              </div>
              {item.note && <p className="muted">{item.note}</p>}
              <label>Guess<input value={item.guess || ''} onChange={(e) => updateDetected(index, 'guess', e.target.value)} /></label>
              <label>Quantity<input type="number" min="1" value={item.quantity || 1} onChange={(e) => updateDetected(index, 'quantity', Number(e.target.value))} /></label>
            </article>
          ))}
        </div>
        {canSave && <button onClick={handleSaveInventory}>Add to inventory</button>}
      </section>

      <section className="panel">
        <h2>Inventory intelligence</h2>
        <p className="muted">Turn a pile of parts into build decisions.</p>
        <div className="stats">
          <div className="stat"><span className="stat-label">Inventory items</span><strong>{inventory.length}</strong></div>
          <div className="stat"><span className="stat-label">Estimated value</span><strong>£{inventoryValue}</strong></div>
        </div>
        {intelligence && (
          <>
            <div className="card-stack">
              {intelligence.builds.map((build) => (
                <article className="card" key={build.name}>
                  <div className="card-head">
                    <h3>{build.name}</h3>
                    <span className={`badge ${build.possible ? 'ok' : 'warn'}`}>{build.possible ? 'buildable' : 'missing parts'}</span>
                  </div>
                  {build.missing.length > 0 ? (
                    <ul>{build.missing.map((item) => (<li key={item.part}>{item.part}: need {item.needed}, have {item.available}</li>))}</ul>
                  ) : (<p>Everything needed is present.</p>)}
                </article>
              ))}
            </div>
            <article className="card"><h3>Quick insight</h3><ul>{intelligence.insights.map((insight) => (<li key={insight}>{insight}</li>))}</ul></article>
          </>
        )}
      </section>

      <section className="panel panel-wide">
        <h2>Search</h2>
        <p className="muted">What is it. Where can you get it. Do you already own it.</p>
        <div className="search-row">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search FPV parts, e.g. 0802 22000kv" />
          <button onClick={() => handleSearch()}>Search</button>
        </div>
        {searchData && (
          <div className="search-grid">
            <article className="card"><h3>{searchData.canonical.name}</h3><p>{searchData.canonical.subtitle}</p></article>
            <article className="card"><h3>Available now</h3>{searchData.retailers.map((r) => (<div className="list-row" key={r.id}><span>{r.store}</span><span>£{r.price}</span><span>{r.stock}</span></div>))}</article>
            <article className="card"><h3>You already own</h3>{searchData.owned.length === 0 ? <p>None found.</p> : searchData.owned.map((item) => (<div className="list-row" key={item.id}><span>{item.name}</span><span>{item.quantity}x</span></div>))}</article>
            <article className="card"><h3>Similar parts</h3><div className="chip-wrap">{searchData.suggestions.map((item) => (<button key={item} className="chip" onClick={() => handleSearch(item)}>{item}</button>))}</div></article>
          </div>
        )}
      </section>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('feed');
  const [selectedBuild, setSelectedBuild] = useState(null);

  // Data state
  const [myBuilds, setMyBuilds] = useState([]);
  const [feedBuilds, setFeedBuilds] = useState([]);
  const [myLikes, setMyLikes] = useState({ build: {}, flight_proof: {} });
  const [likeCounts, setLikeCounts] = useState({});

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) loadUserData(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) loadUserData(session.user.id);
      else { setProfile(null); setMyBuilds([]); }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load feed on mount
  useEffect(() => {
    loadFeed();
  }, []);

  const loadUserData = async (userId) => {
    const [profileData, builds, likes] = await Promise.all([
      db.fetchProfile(userId),
      db.fetchMyBuilds(userId),
      db.fetchMyLikes(userId)
    ]);
    setProfile(profileData);
    setMyBuilds(builds);
    setMyLikes(likes);
  };

  const loadFeed = async () => {
    const builds = await db.fetchPublicBuilds();
    setFeedBuilds(builds);
    if (builds.length) {
      const counts = await db.fetchLikeCounts(builds.map(b => b.id));
      setLikeCounts(counts);
    }
  };

  const handleAuth = (authedUser) => {
    setUser(authedUser);
    loadUserData(authedUser.id);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setMyBuilds([]);
    setView('feed');
  };

  const handleAddBuild = async (buildData) => {
    const build = await db.insertBuild({
      user_id: user.id,
      build_name: buildData.build_name,
      model_label: buildData.model_label || null,
      note: null,
      visibility: 'private',
      lifecycle_status: 'flying',
      flight_proof_media: buildData.flight_proof_media || null
    });

    if (build && buildData.parts?.length) {
      const parts = buildData.parts.map(p => ({
        user_id: user.id,
        build_id: build.id,
        canonical_name: p.canonical_name,
        part_type: p.part_type,
        quantity: p.quantity || 1,
        condition: p.condition || 'unknown',
        evidence_state: p.evidence_state || 'confirmed',
        variant: p.variant || {},
        source: 'manual'
      }));
      await db.insertParts(parts);
    }

    setMyBuilds(await db.fetchMyBuilds(user.id));
    loadFeed();
    return build;
  };

  const handleUpdateBuild = async (buildId, updates) => {
    await db.updateBuild(buildId, updates);
    setMyBuilds(await db.fetchMyBuilds(user.id));
    loadFeed();
  };

  const handleLikeBuild = async (buildId) => {
    if (!user) return;
    const nowLiked = await db.toggleLike(user.id, buildId, 'build');
    setMyLikes(prev => ({
      ...prev,
      build: { ...prev.build, [buildId]: nowLiked }
    }));
    const allBuildIds = [...new Set([...myBuilds.map(b => b.id), ...feedBuilds.map(b => b.id)])];
    setLikeCounts(await db.fetchLikeCounts(allBuildIds));
  };

  const handleLikeFlightProof = async (buildId) => {
    if (!user) return;
    const nowLiked = await db.toggleLike(user.id, buildId, 'flight_proof');
    setMyLikes(prev => ({
      ...prev,
      flight_proof: { ...prev.flight_proof, [buildId]: nowLiked }
    }));
    const allBuildIds = [...new Set([...myBuilds.map(b => b.id), ...feedBuilds.map(b => b.id)])];
    setLikeCounts(await db.fetchLikeCounts(allBuildIds));
  };

  const handleSelectBuild = (build) => {
    setSelectedBuild(build);
    setView('detail');
  };

  const handleBack = () => {
    setSelectedBuild(null);
    setView('feed');
  };

  if (loading) {
    return (
      <div className="app-shell">
        <div className="auth-container"><p className="muted">Loading...</p></div>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuth={handleAuth} />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-logo"><PropDeckLogo size={22} /> PropDeck</span>
        <nav className="app-nav">
          <button
            className={`nav-tab ${view === 'feed' || view === 'detail' ? 'active' : ''}`}
            onClick={() => { setView('feed'); setSelectedBuild(null); }}
          >
            Feed
          </button>
          <button
            className={`nav-tab ${view === 'builds' ? 'active' : ''}`}
            onClick={() => { setView('builds'); setSelectedBuild(null); }}
          >
            Garage
          </button>
          <button
            className={`nav-tab ${view === 'search' ? 'active' : ''}`}
            onClick={() => setView('search')}
          >
            Search
          </button>
        </nav>
        <div className="app-user">
          <span className="app-username">{profile?.username || user.email}</span>
          <button className="btn btn-ghost" onClick={handleSignOut}>Sign out</button>
        </div>
      </header>

      {(view === 'feed') && (
        <FeedView
          builds={feedBuilds}
          likeCounts={likeCounts}
          myLikes={myLikes}
          onLikeBuild={handleLikeBuild}
          onSelectBuild={handleSelectBuild}
        />
      )}

      {(view === 'detail' || view === 'builds') && (
        <BuildView
          myBuilds={myBuilds}
          profile={profile}
          user={user}
          onAddBuild={handleAddBuild}
          onUpdateBuild={handleUpdateBuild}
          onProfileUpdate={(updated) => setProfile(updated)}
          likeCounts={likeCounts}
          myLikes={myLikes}
          onLikeBuild={handleLikeBuild}
          onLikeFlightProof={handleLikeFlightProof}
          selectedBuild={view === 'detail' ? selectedBuild : null}
          onBack={handleBack}
        />
      )}

      {view === 'search' && (
        <SearchView onAddToGarage={(data) => { handleAddBuild(data); setView('builds'); }} />
      )}

      <footer className="app-footer">
        Part of <a href="https://graft.tools" target="_blank" rel="noopener noreferrer">graft.tools</a>
      </footer>
    </div>
  );
}
