# Build stage
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Copy package files and install all dependencies (including dev for build)
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production stage
FROM node:22-bookworm-slim

WORKDIR /app

# Install system dependencies required by Chrome Headless Shell (Remotion renderer)
RUN apt-get update && apt-get install -y --no-install-recommends \
  libnss3 \
  libdbus-1-3 \
  libatk1.0-0 \
  libgbm-dev \
  libasound2 \
  libxrandr2 \
  libxkbcommon-dev \
  libxfixes3 \
  libxcomposite1 \
  libxdamage1 \
  libatk-bridge2.0-0 \
  libpango-1.0-0 \
  libcairo2 \
  libcups2 \
  fonts-noto-color-emoji \
  && rm -rf /var/lib/apt/lists/*

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Install Chrome Headless Shell for Remotion
RUN npx remotion browser ensure

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy Remotion source (needed for bundle() at runtime — bundler reads source TSX files)
# NOTE: Remotion's bundle() needs the original source files, not compiled JS.
# It uses its own Webpack bundler to create a browser-compatible bundle from the React components.
COPY src/remotion ./src/remotion

# Create output directory for rendered videos
RUN mkdir -p /app/output

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Run the server
CMD ["node", "dist/index.js"]
