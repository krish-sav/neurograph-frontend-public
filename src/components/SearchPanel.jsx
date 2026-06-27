import React, { useState } from 'react';
import './SearchPanel.css';

const SearchPanel = ({ stats, filters, onSearch, onFilterChange, onReset, onExport }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    filters: true,
    stats: true,
  });

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const handleConfidenceChange = (e) => {
    const value = Number(e.target.value);
    onFilterChange({
      ...filters,
      minConfidence: value,
    });
  };

  const handleYearChange = (e) => {
    const value = Number(e.target.value);
    onFilterChange({
      ...filters,
      maxYear: value,
    });
  };

  const handleConnectionTypeChange = (type) => {
    const currentTypes = filters.connectionTypes || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];

    onFilterChange({
      ...filters,
      connectionTypes: newTypes,
    });
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="search-panel">
      {/* Search Box */}
      <div className="search-box-container">
        <label htmlFor="search" className="search-label">Search</label>
        <div className="search-input-wrapper">
          <input
            id="search"
            type="search"
            placeholder="retinal ganglion cells..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-section">
          <button
            className="section-header"
            onClick={() => toggleSection('stats')}
          >
            <span className="section-title">Statistics</span>
            <span className={`toggle-icon ${expandedSections.stats ? 'open' : ''}`}>›</span>
          </button>

          {expandedSections.stats && (
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{stats.total_nodes}</span>
                <span className="stat-label">Nodes</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.total_edges}</span>
                <span className="stat-label">Edges</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.total_papers}</span>
                <span className="stat-label">Papers</span>
              </div>
              <div className="stat-item alert">
                <span className="stat-value">{stats.edges_with_conflicts}</span>
                <span className="stat-label">Conflicts</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <button
          className="section-header"
          onClick={() => toggleSection('filters')}
        >
          <span className="section-title">Filters</span>
          <span className={`toggle-icon ${expandedSections.filters ? 'open' : ''}`}>›</span>
        </button>

        {expandedSections.filters && (
          <div className="filters-content">
            {/* Connection Type Filter */}
            {stats?.connection_types && (
              <div className="filter-group">
                <label className="filter-label">Connection Type</label>
                <div className="connection-types">
                  {stats.connection_types.map(type => (
                    <button
                      key={type}
                      className={`type-chip ${(filters.connectionTypes || []).includes(type) ? 'active' : ''}`}
                      onClick={() => handleConnectionTypeChange(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Confidence Slider */}
            <div className="filter-group">
              <label className="filter-label">
                Confidence: <span className="filter-value">{filters.minConfidence}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={filters.minConfidence}
                onChange={handleConfidenceChange}
                className="slider"
              />
            </div>

            {/* Year Slider */}
            <div className="filter-group">
              <label className="filter-label">
                Year: <span className="filter-value">{filters.maxYear}</span>
              </label>
              <input
                type="range"
                min="2010"
                max="2024"
                value={filters.maxYear}
                onChange={handleYearChange}
                className="slider"
              />
            </div>

            {/* Filter Actions */}
            <div className="filter-actions">
              <button onClick={onReset} className="btn btn-secondary">
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="legend-section">
        <div className="section-title">Legend</div>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-dot excitatory"></span>
            <span>Excitatory</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot inhibitory"></span>
            <span>Inhibitory</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot modulatory"></span>
            <span>Modulatory</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot unknown"></span>
            <span>Unknown</span>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <button onClick={onExport} className="btn btn-primary btn-export">
        📥 Export JSON
      </button>
    </div>
  );
};

export default SearchPanel;

