# 🚀 NeuroGraph - Quick Start Guide

Welcome to NeuroGraph! This guide will get you up and running in minutes.

## ⚡ 30-Second Setup

### macOS/Linux
```bash
bash setup.sh
```

### Windows
```cmd
setup.bat
```

That's it! The setup script will:
- ✓ Check Python & Node.js
- ✓ Create virtual environment
- ✓ Install all dependencies
- ✓ Create convenience scripts

## 🎯 Start Development

After setup, run in **2 separate terminals**:

### Terminal 1: Backend
```bash
# macOS/Linux
./run-backend.sh

# Windows
run-backend.bat
```

Expected output:
```
 * Running on http://127.0.0.1:5000
```

### Terminal 2: Frontend
```bash
# macOS/Linux
./run-frontend.sh

# Windows
run-frontend.bat
```

Expected output:
```
 ➜  Local:   http://localhost:3000/
```

## 🔐 Login

Once the app opens, use these credentials:

**Email**: `demo@neurograph.ai`
**Password**: `demo123`

Or create a new account!

## 🎨 What You'll See

1. **Beautiful Sign-In Page**
   - Animated background
   - Smooth form transitions
   - Professional design

2. **Dashboard**
   - 3D brain visualization
   - Search and filters
   - Evidence viewer
   - Connection details

3. **Interactive Features**
   - Rotate brain: Click and drag
   - Zoom: Scroll wheel
   - Click edges: See evidence
   - Search: Find connections
   - Filter: By confidence, year, type

## 📝 Create Your Own Account

Click "Create one" on the sign-in page and:
1. Enter your name
2. Enter your email
3. Create a password (6+ characters)
4. Click "Create Account"

Your account is instantly ready to use!

## 🔧 Manual Setup (if scripts don't work)

### Backend Setup
```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate.bat  # Windows

# Install dependencies
pip install -r requirements.txt

# Start backend
python backend.py
```

### Frontend Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## 📊 API Endpoints

Test the API with curl:

```bash
# Health check
curl http://localhost:5000/api/health

# Get graph data (requires login)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/graph

# Search
curl -X POST http://localhost:5000/api/graph/search \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"query":"amygdala"}'
```

## 🐛 Troubleshooting

### Python command not found
```bash
# Try python3 instead
python3 backend.py
```

### Port already in use
```bash
# Kill process using port 5000
lsof -i :5000
kill -9 <PID>

# Or use different port (edit backend.py)
```

### Module not found
```bash
# Reinstall dependencies
pip install --upgrade -r requirements.txt
npm install --force
```

### CORS errors
- Check backend is running on :5000
- Verify vite.config.js proxy settings
- Check Flask-CORS is imported in backend.py

## 📚 File Structure

```
PyCharmMiscProject/
├── backend.py              # API server
├── src/
│   ├── components/         # React components
│   ├── App.jsx             # Main app
│   └── main.jsx            # Entry point
├── package.json            # Frontend deps
├── requirements.txt        # Backend deps
├── vite.config.js          # Frontend config
└── README_SETUP.md         # Full docs
```

## 🎯 Next Steps

1. **Explore the interface**
   - Search for brain regions
   - Click connections to see evidence
   - Adjust filters
   - Rotate the 3D model

2. **Register a real account**
   - Create personal account
   - Save preferences
   - Export data

3. **Integrate your data**
   - Edit neurograph.json
   - Add your own connections
   - Backend will reload

4. **Customize**
   - Edit colors in CSS files
   - Add new features
   - Deploy to production

## 🚀 Production Deployment

### Docker (Recommended)
```bash
docker-compose up -d
```

### Vercel (Frontend)
```bash
npm run build
# Deploy dist/ to Vercel
```

### Heroku (Backend)
```bash
git push heroku main
```

## 📖 Full Documentation

See `README_SETUP.md` for comprehensive docs including:
- Configuration options
- API reference
- Feature explanations
- Architecture
- Development tips

## 💡 Tips & Tricks

1. **Fast Development**
   - Use browser DevTools (F12)
   - React DevTools extension helps
   - Hot reload on file changes

2. **Testing API**
   - Use VS Code REST Client
   - Or Postman/Insomnia apps
   - Check Network tab in DevTools

3. **Debug Backend**
   - Add `print()` statements
   - Use Python debugger
   - Check Flask logs

4. **Debug Frontend**
   - React DevTools extension
   - Browser console (F12)
   - Network requests tab

## ❓ Common Questions

**Q: Can I use this with my own data?**
A: Yes! Edit `neurograph.json` or connect a database.

**Q: How do I add more brain regions?**
A: Add to `neurograph.json` nodes array.

**Q: Can I deploy this online?**
A: Yes! See deployment sections in README_SETUP.md

**Q: How do I backup my data?**
A: Click "Export JSON" button in app.

**Q: Can I use this offline?**
A: Sort of - backend needs to run, but no internet required.

## 🎉 You're Ready!

Congratulations! You now have a fully functional NeuroGraph instance.

Start exploring the neuroscience knowledge graph! 🧠✨

### Need Help?

- Check `README_SETUP.md` for detailed docs
- See `IMPLEMENTATION_SUMMARY.md` for architecture
- Review code comments in components
- Check browser console for errors

**Happy exploring!** 🚀

