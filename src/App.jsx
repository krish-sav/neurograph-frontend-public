import React, { useState, useEffect } from 'react';
import SignIn from './components/SignIn';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (err) {
        console.error('Failed to parse user data:', err);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
    }

    setLoading(false);
  }, []);

  const handleSignInSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading NeuroGraph...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <>
      {!user ? (
        <SignIn onSuccess={handleSignInSuccess} />
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;

