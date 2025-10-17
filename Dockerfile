# Use Debian-based Node (better compatibility with native modules)
FROM node:20-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clean install with proper binary builds
RUN npm cache clean --force && \
    npm ci --prefer-offline --no-audit

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Start command
CMD ["npm", "run", "dev"]