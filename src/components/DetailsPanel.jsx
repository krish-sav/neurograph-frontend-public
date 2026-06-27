import React, { useState, useEffect } from 'react';
import './DetailsPanel.css';

const DetailsPanel = ({ selectedEdge, filteredGraph }) => {
  const [expandedSection, setExpandedSection] = useState(null);

  if (!selectedEdge) {
    return (
      <div className="details-panel empty">
        <div className="empty-state">
          <span className="empty-icon">📊</span>
          <p>Select a connection to view details</p>
        </div>
      </div>
    );
  }

  const sourceNode = filteredGraph?.nodes?.find(n => n.id === selectedEdge.source);
  const targetNode = filteredGraph?.nodes?.find(n => n.id === selectedEdge.target);

  return (
    <div className="details-panel">
      {/* Selected Connection Card */}
      <div className="detail-card selected-card">
        <p className="card-label">Selected Connection</p>
        <h3 className="connection-title">
          {selectedEdge.source}
          <span className="arrow">→</span>
          {selectedEdge.target}
        </h3>

        <div className="meta-tags">
          <span className="tag">{selectedEdge.relation}</span>
          <span className={`tag type-${selectedEdge.connection_type?.toLowerCase()}`}>
            {selectedEdge.connection_type}
          </span>
          <span className="tag confidence">
            {Math.round(selectedEdge.confidence)}% confidence
          </span>
          {selectedEdge.contradiction_count > 0 && (
            <span className="tag conflict">
              ⚠️ {selectedEdge.contradiction_count} conflicts
            </span>
          )}
        </div>

        <p className="detail-summary">
          {selectedEdge.source} {selectedEdge.relation.toLowerCase()} {selectedEdge.target}
          through {selectedEdge.connection_type?.toLowerCase()} signaling.
          Supported by {selectedEdge.evidence?.length || 0} publication(s).
        </p>
      </div>

      {/* Evidence Section */}
      <div className="detail-card">
        <button
          className="card-header"
          onClick={() => setExpandedSection(expandedSection === 'evidence' ? null : 'evidence')}
        >
          <h4>Evidence</h4>
          <span className="evidence-count">
            {selectedEdge.evidence?.length || 0} items
          </span>
          <span className={`toggle-icon ${expandedSection === 'evidence' ? 'open' : ''}`}>›</span>
        </button>

        {expandedSection === 'evidence' && (
          <div className="evidence-list">
            {selectedEdge.evidence?.map((item, idx) => (
              <div key={idx} className={`evidence-item polarity-${item.polarity}`}>
                <div className="evidence-header">
                  <span className={`polarity-badge ${item.polarity}`}>
                    {item.polarity === 'support' ? '✓' : '✗'} {item.polarity.toUpperCase()}
                  </span>
                  <span className="evidence-year">{item.paper?.year}</span>
                </div>
                <p className="evidence-title">{item.paper?.title}</p>
                <p className="evidence-sentence">{item.sentence}</p>
                <div className="evidence-meta">
                  <span>{item.paper?.journal}</span>
                  {item.method && <span>{item.method}</span>}
                  {item.species && <span>{item.species}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nodes Details */}
      <div className="detail-card">
        <button
          className="card-header"
          onClick={() => setExpandedSection(expandedSection === 'nodes' ? null : 'nodes')}
        >
          <h4>Connection Nodes</h4>
          <span className={`toggle-icon ${expandedSection === 'nodes' ? 'open' : ''}`}>›</span>
        </button>

        {expandedSection === 'nodes' && (
          <div className="nodes-info">
            {sourceNode && (
              <div className="node-detail">
                <div className="node-type-badge">{sourceNode.kind}</div>
                <h5>{sourceNode.id}</h5>
                <p className="node-role">Source</p>
              </div>
            )}

            {targetNode && (
              <div className="node-detail">
                <div className="node-type-badge">{targetNode.kind}</div>
                <h5>{targetNode.id}</h5>
                <p className="node-role">Target</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailsPanel;

