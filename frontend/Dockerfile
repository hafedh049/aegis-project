# ---------- Base Stage ----------
FROM node:20-alpine AS base
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# ---------- Dependencies Stage ----------
FROM base AS deps
# Install dependencies while ignoring peer conflicts
RUN npm install --legacy-peer-deps && apk add --no-cache bind-tools curl

# ---------- Build Stage ----------
FROM deps AS build
# Copy source
COPY . .
# Build Next.js app
RUN npm run build

# ---------- Production Stage ----------
FROM node:20-alpine AS prod
WORKDIR /app

RUN apk add --no-cache bind-tools curl

# Copy only what’s needed
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package*.json ./

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
