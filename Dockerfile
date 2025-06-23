# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all source files including prisma
COPY . .

# Verify prisma directory exists (debug step)
RUN ls -la prisma/ || echo "PRISMA DIRECTORY NOT FOUND"

# Generate Prisma client
RUN npx prisma generate

# Build NestJS project
RUN npm run build

# Run stage
FROM node:20-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./

# Explicitly copy prisma directory from builder stage
COPY --from=builder /app/prisma ./prisma

# Verify prisma was copied (debug step)
RUN ls -la prisma/ || echo "PRISMA NOT COPIED TO PRODUCTION STAGE"

# Install production dependencies
RUN npm install --only=production

# Generate Prisma client in production
RUN npx prisma generate

# Copy built application
COPY --from=builder /app/dist ./dist

# Create startup script for migrations and app start
RUN echo '#!/bin/sh' > start.sh && \
    echo 'echo "Running Prisma migrations..."' >> start.sh && \
    echo 'npx prisma migrate deploy' >> start.sh && \
    echo 'echo "Starting application..."' >> start.sh && \
    echo 'node dist/main.js' >> start.sh && \
    chmod +x start.sh

# Start the app
CMD ["./start.sh"]