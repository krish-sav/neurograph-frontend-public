FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy frontend files
COPY package.json package-lock.json ./
RUN npm install

COPY vite.config.js index-react.html ./
COPY src ./src

# Build frontend
RUN npm run build

# Copy backend files
COPY backend.py .
COPY neurograph.json .

# Expose ports
EXPOSE 5000 3000

# Start both services
CMD ["sh", "-c", "python backend.py & npm run preview"]

