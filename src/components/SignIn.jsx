import React, { useState, useRef } from 'react';
import './SignIn.css';

export const SignIn = ({ onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const emailRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const validate = () => {
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return false;
    }
    // basic email check
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      setError('Please enter a valid email');
      return false;
    }
    if (isSignUp && formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError('');

    try {
      const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';
      const payload = isSignUp ? formData : { email: formData.email, password: formData.password };

      const response = await fetch(`http://localhost:5001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Authentication failed');

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onSuccess && onSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = () => {
    setFormData({ email: 'demo@neurograph.ai', password: 'demo123', name: 'Demo User' });
    // focus and submit after a short animation
    setTimeout(() => {
      emailRef.current && emailRef.current.focus();
      handleSubmit();
    }, 420);
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setFormData({ email: '', password: '', name: '' });
  };

  return (
    <div className="signin-container">
      <div className="background-animation">
        <div className="blob blob-1" aria-hidden="true"></div>
        <div className="blob blob-2" aria-hidden="true"></div>
        <div className="blob blob-3" aria-hidden="true"></div>
      </div>

      <aside className="signin-left" aria-hidden="true">
        <div className="branding">
          <div className="logo-circle">
            <svg viewBox="0 0 100 100" className="brain-icon" aria-hidden="true">
              <circle cx="30" cy="40" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="70" cy="40" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="50" cy="65" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M 30 48 Q 50 60 70 48" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>

          <h1 className="brand-title">NeuroGraph</h1>
          <p className="brand-subtitle">AI-Powered Living Connectome</p>
          <p className="brand-description">Explore the brain as an interactive knowledge graph where every connection is backed by published science.</p>

          <div className="features">
            <div className="feature-item"><span>🧠</span> Interactive 3D visualization</div>
            <div className="feature-item"><span>📚</span> Evidence-backed connections</div>
            <div className="feature-item"><span>🔬</span> Real neuroscience data</div>
          </div>
        </div>
      </aside>

      <main className="signin-right" role="main">
        <div className="form-card" role="form" aria-labelledby="signin-title">
          <div className="form-head">
            <h2 id="signin-title" className="form-title">{isSignUp ? 'Create account' : 'Welcome back'}</h2>
            <p className="form-subtitle">{isSignUp ? 'Join researchers exploring neural circuits' : 'Sign in to your NeuroGraph account'}</p>
          </div>

          <form className={`signin-form ${isSignUp ? 'signup' : 'login'}`} onSubmit={handleSubmit} noValidate>
            {isSignUp && (
              <label className={`form-group ${formData.name ? 'filled' : ''}`}>
                <input name="name" value={formData.name} onChange={handleChange} className="form-input" placeholder=" " />
                <span className="floating-label">Full name</span>
                <span className="input-underline" aria-hidden="true"></span>
              </label>
            )}

            <label className={`form-group ${formData.email ? 'filled' : ''}`}>
              <input ref={emailRef} name="email" value={formData.email} onChange={handleChange} className="form-input" placeholder=" " type="email" autoComplete="email" />
              <span className="floating-label">Email address</span>
              <span className="input-underline" aria-hidden="true"></span>
            </label>

            <label className={`form-group ${formData.password ? 'filled' : ''}`}>
              <input name="password" value={formData.password} onChange={handleChange} className="form-input" placeholder=" " type={showPassword ? 'text' : 'password'} autoComplete={isSignUp ? 'new-password' : 'current-password'} />
              <span className="floating-label">Password</span>
              <button type="button" className="password-toggle" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
              <span className="input-underline" aria-hidden="true"></span>
            </label>

            {error && <div className="error-message" role="alert">{error}</div>}

            <div className="actions">
              <button className="submit-button" type="submit" disabled={loading} aria-busy={loading}>
                {loading ? 'Working…' : isSignUp ? 'Create account' : 'Sign in'}
              </button>

              <button type="button" className="demo-button" onClick={handleDemo}>
                Try demo account
              </button>
            </div>
          </form>

          <div className="alt-actions">
            <button className="link-button" onClick={toggleMode}>{isSignUp ? 'Have an account? Sign in' : "Don't have an account? Create one"}</button>
          </div>

          <div className="oauth-row">
            <button className="oauth-button google" aria-label="Continue with Google">Continue with Google</button>
          </div>
        </div>

        <div className="security-badge"><span>🔒</span><small>Your data is encrypted</small></div>
      </main>
    </div>
  );
};

export default SignIn;

