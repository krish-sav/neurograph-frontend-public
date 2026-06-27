#!/bin/bash

# NeuroGraph Quick Start Script
# This script sets up both backend and frontend for development

echo "🧠 NeuroGraph Quick Start"
echo "========================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Python
echo -e "${BLUE}Checking Python...${NC}"
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.8 or higher."
    exit 1
fi
echo -e "${GREEN}✓ Python $(python3 --version)${NC}"

# Check Node
echo ""
echo -e "${BLUE}Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16 or higher."
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"
echo -e "${GREEN}✓ npm $(npm --version)${NC}"

# Setup Python environment
echo ""
echo -e "${BLUE}Setting up Python environment...${NC}"
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    echo -e "${GREEN}✓ Virtual environment already exists${NC}"
fi

# Activate venv and install dependencies
source venv/bin/activate
echo -e "${BLUE}Installing Python dependencies...${NC}"
pip install -q -r requirements.txt
echo -e "${GREEN}✓ Python dependencies installed${NC}"

# Setup Node environment
echo ""
echo -e "${BLUE}Installing Node dependencies...${NC}"
npm install -q
echo -e "${GREEN}✓ Node dependencies installed${NC}"

# Copy env file if needed
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Note: Copy .env.example to .env and update with your settings${NC}"
fi

# Create run scripts
echo ""
echo -e "${BLUE}Creating convenience scripts...${NC}"

# Backend run script
cat > run-backend.sh << 'EOF'
#!/bin/bash
source venv/bin/activate
echo "Starting NeuroGraph Backend..."
echo "API will be available at http://localhost:5000"
python backend.py
EOF
chmod +x run-backend.sh

# Frontend run script
cat > run-frontend.sh << 'EOF'
#!/bin/bash
echo "Starting NeuroGraph Frontend..."
echo "Frontend will be available at http://localhost:3000"
npm run dev
EOF
chmod +x run-frontend.sh

echo -e "${GREEN}✓ Convenience scripts created${NC}"

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete! 🎉${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Quick Start (open 2 terminals):"
echo ""
echo -e "${BLUE}Terminal 1 - Backend:${NC}"
echo "  ./run-backend.sh"
echo ""
echo -e "${BLUE}Terminal 2 - Frontend:${NC}"
echo "  ./run-frontend.sh"
echo ""
echo -e "${YELLOW}Demo Credentials:${NC}"
echo "  Email: demo@neurograph.ai"
echo "  Password: demo123"
echo ""
echo "📖 For more info, see README_SETUP.md"
echo ""

