# Next.js 15 works well on Node 20
FROM node:20-alpine

WORKDIR /app

# Install production deps, then add TS so Next won't invoke pnpm
COPY package*.json ./
RUN npm install --legacy-peer-deps
RUN npm install -D typescript @types/node

# Copy sources and build
COPY . .
ENV NODE_ENV=production
# Cloud Run listens on $PORT; default to 8080 for local
ENV PORT=8080
RUN npm run build

# Expose and start
EXPOSE 8080
CMD ["npm", "start", "--", "-p", "8080"]
