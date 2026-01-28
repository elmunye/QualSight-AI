# Use the official lightweight Node.js image.
FROM node:18-slim

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
COPY package*.json ./

# Install dependencies.
RUN npm install

# Copy local code to the container image.
COPY . .

# Build the React frontend (assuming your build script is 'npm run build')
RUN npm run build

# Service must listen to $PORT env var.
ENV PORT 8080

# Run the web service on container startup.
CMD [ "node", "server.js" ]