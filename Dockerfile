# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build NestJS project
RUN npm run build

# Run stage
FROM node:20-alpine
WORKDIR /app

# Copy build output
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Install only production deps
RUN npm install --only=production

#copy the generated Prisma client
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma /app/node_modules/@prisma

# Start the app
CMD ["node", "dist/main.js"]
