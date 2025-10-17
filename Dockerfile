# Use Debian-based Node (better compatibility with native modules)
FROM node:20-slim

# Install pnpm globally (matching your lockfile)
RUN npm install -g pnpm@latest

# Install dependencies for native module compilation
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files (including pnpm-lock.yaml)
COPY package.json pnpm-lock.yaml ./

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Create entrypoint script that installs dependencies if needed
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Check if node_modules exists and has next installed\n\
if [ ! -d "node_modules" ] || [ ! -d "node_modules/next" ]; then\n\
  echo "Installing dependencies with pnpm..."\n\
  pnpm install --no-frozen-lockfile\n\
else\n\
  echo "Dependencies already installed, skipping..."\n\
fi\n\
\n\
echo "Starting Next.js development server..."\n\
exec pnpm run dev\n\
' > /entrypoint.sh && chmod +x /entrypoint.sh

# Use entrypoint
ENTRYPOINT ["/entrypoint.sh"]