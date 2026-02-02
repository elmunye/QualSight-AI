# Use Node 20 (required by @google/genai, @vitejs/plugin-react, p-queue, vitest).
FROM node:20-slim

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
COPY package*.json ./

# Resolve peer conflict (zod-express-middleware expects @types/express@4; project uses @5).
RUN echo "legacy-peer-deps=true" > .npmrc

# Install dependencies (use npm ci for reproducible installs; requires package-lock.json).
RUN npm ci

# Copy local code to the container image.
COPY . .

# Build the React frontend (NODE_ENV=production for Vite build).
ENV NODE_ENV=production
RUN npm run build

# Service must listen to $PORT env var.
ENV PORT 8080

# Run the web service on container startup.
CMD [ "npm", "start" ]