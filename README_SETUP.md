# NeuroGraph - AI-Powered Living Connectome

A beautiful, interactive web application for exploring neuroscience knowledge as an interconnected graph. Features a stunning 3D brain visualization, evidence-backed connections, and professional authentication.

## 🚀 Features

- **Interactive 3D Brain Visualization** - Explore neural circuits in 3D space
- **Evidence-Backed Connections** - Every edge is supported by published research
- **Advanced Filtering** - Search by confidence level, year, connection type
- **Real-time Search** - Find pathways and nodes instantly
- **Beautiful UI** - Professional dark-mode interface with smooth animations
- **Authentication** - Secure user registration and login
- **Data Export** - Download filtered graphs as JSON

## 🛠 Tech Stack

### Frontend
- **React 18** - Modern UI framework
- **Three.js** - 3D brain visualization
- **Vite** - Lightning-fast build tool
- **CSS3** - Professional styling with animations

### Backend
- **Flask** - Python web framework
- **Flask-JWT-Extended** - Token-based authentication
- **Flask-CORS** - Cross-origin resource sharing

## 📋 Prerequisites

- **Node.js** 16+ (for React/Vite)
- **Python** 3.8+ (for Flask backend)
- **npm** or **yarn** (Node package manager)

## 🎯 Quick Start

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Install Node Dependencies

```bash
npm install
```

### 3. Start the Backend Server

Open a terminal and run:

```bash
python backend.py
```

The backend will start on `http://localhost:5000`

### 4. Start the Frontend Development Server

In a new terminal, run:

```bash
npm run dev
```

The frontend will open at `http://localhost:3000`

## 🔐 Authentication

### Demo Credentials

For testing, use these credentials:

- **Email**: `demo@neurograph.ai`
- **Password**: `demo123`

### Register a New Account

Click "Create one" on the sign-in page to register a new account.

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify` - Verify JWT token
- `GET /api/auth/me` - Get current user

### Graph Data
- `GET /api/graph` - Get complete graph data
- `POST /api/graph/search` - Search graph nodes and edges
- `POST /api/graph/filter` - Filter graph by criteria
- `GET /api/graph/stats` - Get graph statistics

### System
- `GET /api/health` - Health check
- `GET /api/info` - API information

## 🎨 UI Components

### Sign-In Page
- Beautiful gradient backgrounds with animated blobs
- Smooth form transitions and validations
- Google OAuth integration ready
- Minimalistic, modern design

### Dashboard
- **Search Panel** - Filter and search functionality
- **Brain Visualization** - Interactive 3D graph
- **Details Panel** - Evidence and connection details

### Features
- Real-time filter updates
- Responsive design (mobile, tablet, desktop)
- Dark mode theme
- Smooth animations and transitions

## 🔄 Data Flow

```
React Frontend
    ↓
Vite Dev Server (port 3000)
    ↓
API Proxy
    ↓
Flask Backend (port 5000)
    ↓
neurograph.json (data storage)
```

## 📁 Project Structure

```
PyCharmMiscProject/
├── backend.py                 # Flask API server
├── requirements.txt           # Python dependencies
├── package.json              # Node dependencies
├── vite.config.js            # Vite configuration
├── index-react.html          # React entry point
├── neurograph.json           # Graph data
├── src/
│   ├── main.jsx              # React entry point
│   ├── App.jsx               # Main app component
│   ├── App.css               # App styles
│   ├── index.css             # Global styles
│   └── components/
│       ├── SignIn.jsx        # Sign-in page
│       ├── SignIn.css        # Sign-in styles
│       ├── Dashboard.jsx     # Main dashboard
│       ├── Dashboard.css     # Dashboard styles
│       ├── SearchPanel.jsx   # Search/filter panel
│       ├── SearchPanel.css   # Search panel styles
│       ├── DetailsPanel.jsx  # Details display
│       ├── DetailsPanel.css  # Details styles
│       ├── BrainVisualization.jsx  # 3D visualization
│       └── BrainVisualization.css  # Visualization styles
```

## 🚀 Building for Production

### Frontend Build
```bash
npm run build
```

This creates an optimized `dist/` folder.

### Backend Deployment
```bash
# Run with production settings
export FLASK_ENV=production
python backend.py
```

## 🔧 Configuration

### Backend Configuration

Edit `backend.py` to change:
- `JWT_SECRET_KEY` - Change this for production!
- `JWT_ACCESS_TOKEN_EXPIRES` - Token expiration time
- Database connection (currently using in-memory)

### Frontend Configuration

Edit `vite.config.js` to change:
- API proxy target
- Development server port
- Build output directory

## 📚 Features Explained

### Brain Visualization
- **Interactive 3D Model** - Rotate, zoom, and pan with mouse
- **Node Colors** - Different colors for brain regions, cell types, diseases
- **Edge Thickness** - Thickness represents confidence level
- **Evidence Links** - Click edges to see supporting evidence

### Search & Filter
- **Text Search** - Search by node or connection name
- **Confidence Filter** - Filter by confidence percentage
- **Year Filter** - Show only recent discoveries
- **Connection Type** - Filter by excitatory, inhibitory, modulatory

### Evidence Panel
- **Polarity** - Support or contradict evidence
- **Paper Details** - Title, journal, authors, year
- **Methodology** - Experimental method used
- **Species** - Which organism was studied

## 🎯 Next Steps / Future Enhancements

1. **Database Integration** - Replace in-memory storage with PostgreSQL/MongoDB
2. **Advanced NLP** - Integrate SciBERT for automatic paper parsing
3. **Conflict Resolution** - AI-powered analysis of conflicting evidence
4. **Multi-language Support** - Support for international researchers
5. **Paper Integration** - Direct links to PubMed, bioRxiv, etc.
6. **Advanced 3D Features** - VR support, better anatomy models
7. **Collaboration Features** - Shared graphs, annotations
8. **Mobile App** - React Native mobile version

## 🐛 Troubleshooting

### Backend won't start
```bash
# Clear any existing Python processes
pkill -f "python backend.py"

# Reinstall dependencies
pip install --upgrade -r requirements.txt

# Start fresh
python backend.py
```

### Frontend won't connect to backend
```bash
# Check if backend is running on port 5000
lsof -i :5000

# Check CORS settings in backend.py
# Verify proxy settings in vite.config.js
```

### Module not found errors
```bash
# Reinstall npm packages
rm -rf node_modules package-lock.json
npm install

# Reinstall Python packages
pip install -r requirements.txt --force-reinstall
```

## 📝 License

This project is licensed under the MIT License - see LICENSE file for details.

## 👥 Contributors

NeuroGraph Team

## 📞 Support

For issues, questions, or suggestions, please open an issue on GitHub.

## 🙏 Acknowledgments

- Three.js for 3D visualization capabilities
- React community for amazing tools and libraries
- Flask ecosystem for backend framework
- Neuroscience research community for inspiration

---

**Built with ❤️ for neuroscience researchers worldwide**

