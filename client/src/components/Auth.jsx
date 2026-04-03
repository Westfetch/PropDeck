import React, { useState } from 'react';
import { supabase } from '../supabase.js';

const Auth = ({ onAuth }) => {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSignUp = async () => {
    if (!email || !password || !username) {
      setError('All fields required');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Profile is created automatically by database trigger
      onAuth(data.user);
    } else {
      setMessage('Check your email to confirm your account.');
    }

    setLoading(false);
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Email and password required');
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    onAuth(data.user);
    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'signup') handleSignUp();
    else handleSignIn();
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">PropDeck</h2>
        <p className="auth-subtitle">
          {mode === 'signup' ? 'Create your pilot account' : 'Sign in to your garage'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <label className="form-label">
              Username
              <input
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="e.g. whoop_ripper"
                autoComplete="username"
              />
            </label>
          )}

          <label className="form-label">
            Email
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="form-label">
            Password
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? '6+ characters' : ''}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </label>

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-message">{message}</div>}

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={loading}
          >
            {loading ? '...' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'signin' ? (
            <span>
              No account? <button className="auth-switch-btn" onClick={() => { setMode('signup'); setError(''); }}>Sign up</button>
            </span>
          ) : (
            <span>
              Already have one? <button className="auth-switch-btn" onClick={() => { setMode('signin'); setError(''); }}>Sign in</button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
