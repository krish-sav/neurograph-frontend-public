import React, { useState, useEffect, useRef } from 'react';
import BrainVisualization from './BrainVisualization';
import SearchPanel from './SearchPanel';
import DetailsPanel from './DetailsPanel';
import './Dashboard.css';

const Dashboard = ({ user, onLogout }) => {
  const [graph, setGraph] = useState(null);
  const [filteredGraph, setFilteredGraph] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [filters, setFilters] = useState({
    query: '',
    minConfidence: 0,
    maxYear: 2023,
    connectionTypes: [],
  });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load graph data on mount
  useEffect(() => {
    loadGraphData();
    loadStats();
  }, []);

  const loadGraphData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:5001/api/graph', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load graph data');
      }

      const data = await response.json();
      setGraph(data);
      setFilteredGraph(data);

      if (data.edges && data.edges.length > 0) {
        setSelectedEdge(data.edges[0]);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error loading graph:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:5001/api/graph/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleSearch = async (query) => {
    setFilters(prev => ({ ...prev, query }));

    if (!query.trim()) {
      setFilteredGraph(graph);
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:5001/api/graph/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ query })
      });

      if (response.ok) {
        const data = await response.json();
        setFilteredGraph({
          nodes: data.nodes,
          edges: data.edges
        });
      }
    } catch (err) {
      console.error('Error searching:', err);
    }
  };

  const handleFilterChange = async (newFilters) => {
    setFilters(newFilters);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:5001/api/graph/filter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newFilters)
      });

      if (response.ok) {
        const data = await response.json();
        setFilteredGraph(data);
      }
    } catch (err) {
      console.error('Error filtering:', err);
    }
  };

  const handleExport = () => {
    if (filteredGraph) {
      const blob = new Blob([JSON.stringify(filteredGraph, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `neurograph-export-${new Date().toISOString()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleReset = () => {
    setFilters({
      query: '',
      minConfidence: 0,
      maxYear: stats?.max_year || 2023,
      connectionTypes: [],
    });
    setFilteredGraph(graph);
    setSelectedEdge(graph?.edges?.[0] || null);
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading NeuroGraph...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo-small">
            <span className="logo-icon">🧠</span>
            <h1>NeuroGraph</h1>
          </div>
          <p className="header-subtitle">Living connectome of scientific knowledge</p>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="user-name">{user.name || user.email}</span>
            <span className="user-email">{user.email}</span>
          </div>
          <button onClick={onLogout} className="logout-button">
            Sign Out
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="dashboard-content">
        <SearchPanel
          stats={stats}
          filters={filters}
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
          onExport={handleExport}
        />

        <div className="dashboard-main">
          <BrainVisualization
            graph={filteredGraph}
            selectedEdge={selectedEdge}
            onEdgeSelect={setSelectedEdge}
          />
        </div>

        <DetailsPanel
          selectedEdge={selectedEdge}
          filteredGraph={filteredGraph}
        />
      </div>
    </div>
  );
};

export default Dashboard;

