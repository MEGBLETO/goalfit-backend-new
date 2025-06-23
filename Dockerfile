# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and prisma schema
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build NestJS project
RUN npm run build

# Run stage
FROM node:20-alpine
WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy prisma directory (contains schema and migrations)
COPY --from=builder /app/prisma ./prisma

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --only=production

# Generate Prisma client in production stage
RUN npx prisma generate

# Start the app
CMD ["node", "dist/main.js"]