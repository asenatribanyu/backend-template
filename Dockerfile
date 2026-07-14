# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for node-gyp (e.g. bcrypt)
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Assuming there's no build step for plain JS. 
# If there is, it would go here (e.g., npm run build)

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/src ./src
COPY --from=builder /app/storage ./storage

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
