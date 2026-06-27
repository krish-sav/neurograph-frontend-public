"""
NeuroGraph Backend Server
FastAPI/Flask-based API for authentication, data serving, and knowledge graph operations
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta, datetime
import json
import os
from functools import wraps

app = Flask(__name__)
CORS(app)

# Configuration
app.config['JWT_SECRET_KEY'] = 'your-secret-key-change-in-production'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=30)

jwt = JWTManager(app)

# In-memory user database (replace with real database in production)
users_db = {
    'demo@neurograph.ai': {
        'password': generate_password_hash('demo123'),
        'name': 'Demo User',
        'email': 'demo@neurograph.ai'
    }
}

# Load graph data
def load_graph_data():
    try:
        with open('neurograph.json', 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading graph: {e}")
        return {"nodes": [], "edges": []}

# ============================================================================
# Authentication Endpoints
# ============================================================================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()

    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400

    email = data['email'].lower()

    if email in users_db:
        return jsonify({'error': 'Email already registered'}), 409

    # Validate password strength
    if len(data['password']) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    users_db[email] = {
        'password': generate_password_hash(data['password']),
        'name': data.get('name', email.split('@')[0]),
        'email': email,
        'created_at': datetime.utcnow().isoformat()
    }

    access_token = create_access_token(identity=email)

    return jsonify({
        'success': True,
        'access_token': access_token,
        'user': {
            'email': email,
            'name': users_db[email]['name']
        }
    }), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    """Authenticate user and return JWT token"""
    data = request.get_json()

    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400

    email = data['email'].lower()

    if email not in users_db:
        return jsonify({'error': 'Invalid credentials'}), 401

    user = users_db[email]

    if not check_password_hash(user['password'], data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401

    access_token = create_access_token(identity=email)

    return jsonify({
        'success': True,
        'access_token': access_token,
        'user': {
            'email': email,
            'name': user['name']
        }
    }), 200


@app.route('/api/auth/verify', methods=['POST'])
@jwt_required()
def verify_token():
    """Verify JWT token validity"""
    email = get_jwt_identity()

    if email not in users_db:
        return jsonify({'error': 'User not found'}), 404

    user = users_db[email]

    return jsonify({
        'valid': True,
        'user': {
            'email': email,
            'name': user['name']
        }
    }), 200


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user"""
    email = get_jwt_identity()

    if email not in users_db:
        return jsonify({'error': 'User not found'}), 404

    user = users_db[email]

    return jsonify({
        'email': email,
        'name': user['name'],
        'created_at': user.get('created_at')
    }), 200


# ============================================================================
# Graph Data Endpoints
# ============================================================================

@app.route('/api/graph', methods=['GET'])
@jwt_required()
def get_graph():
    """Get complete graph data"""
    graph = load_graph_data()
    return jsonify(graph), 200


@app.route('/api/graph/search', methods=['POST'])
@jwt_required()
def search_graph():
    """Search graph for nodes and edges"""
    data = request.get_json()
    query = data.get('query', '').lower()

    if not query:
        return jsonify({'error': 'Query required'}), 400

    graph = load_graph_data()

    # Search in nodes
    matching_nodes = [
        node for node in graph['nodes']
        if query in node['id'].lower() or query in node.get('label', '').lower()
    ]

    # Search in edges
    matching_edges = [
        edge for edge in graph['edges']
        if query in edge['source'].lower() or
           query in edge['target'].lower() or
           query in edge.get('relation', '').lower()
    ]

    return jsonify({
        'nodes': matching_nodes,
        'edges': matching_edges,
        'query': query
    }), 200


@app.route('/api/graph/filter', methods=['POST'])
@jwt_required()
def filter_graph():
    """Filter graph by various criteria"""
    data = request.get_json()
    graph = load_graph_data()

    min_confidence = data.get('min_confidence', 0)
    max_year = data.get('max_year', 2024)
    connection_types = data.get('connection_types', [])

    filtered_edges = graph['edges']

    if min_confidence > 0:
        filtered_edges = [
            e for e in filtered_edges
            if e.get('confidence', 0) >= min_confidence
        ]

    if connection_types:
        filtered_edges = [
            e for e in filtered_edges
            if e.get('connection_type') in connection_types
        ]

    if max_year:
        filtered_edges = [
            e for e in filtered_edges
            if any(ev.get('paper', {}).get('year', 0) <= max_year
                   for ev in e.get('evidence', []))
        ]

    # Get nodes that are in filtered edges
    node_ids = set()
    for edge in filtered_edges:
        node_ids.add(edge['source'])
        node_ids.add(edge['target'])

    filtered_nodes = [n for n in graph['nodes'] if n['id'] in node_ids]

    return jsonify({
        'nodes': filtered_nodes,
        'edges': filtered_edges
    }), 200


@app.route('/api/graph/stats', methods=['GET'])
@jwt_required()
def get_stats():
    """Get graph statistics"""
    graph = load_graph_data()

    papers = set()
    for edge in graph['edges']:
        for evidence in edge.get('evidence', []):
            papers.add(evidence.get('paper', {}).get('doi'))

    conflict_edges = sum(1 for e in graph['edges'] if e.get('contradiction_count', 0) > 0)

    return jsonify({
        'total_nodes': len(graph['nodes']),
        'total_edges': len(graph['edges']),
        'total_papers': len(papers),
        'edges_with_conflicts': conflict_edges,
        'connection_types': list(set(e.get('connection_type') for e in graph['edges'])),
        'average_confidence': sum(e.get('confidence', 0) for e in graph['edges']) / len(graph['edges']) if graph['edges'] else 0
    }), 200


# ============================================================================
# Health & Info Endpoints
# ============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'NeuroGraph API'
    }), 200


@app.route('/api/info', methods=['GET'])
def app_info():
    """Get application information"""
    return jsonify({
        'name': 'NeuroGraph',
        'version': '1.0.0',
        'description': 'AI-Powered Living Connectome of Scientific Knowledge',
        'api_version': 'v1'
    }), 200


# ============================================================================
# Error Handlers
# ============================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)

