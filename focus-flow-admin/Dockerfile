# ─────────────────────────────────────────────────────────────
# Focus Flow Admin — Multi-stage Docker build
# Stage 1: Build the Vite app
# Stage 2: Serve with nginx
#
# Vite bakes env vars into the bundle at BUILD TIME.
# Pass them as --build-arg flags or set them in your
# deployment platform (Render / Coolify) env var panel.
# ─────────────────────────────────────────────────────────────

# ── Stage 1: Build ───────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (cached layer if package.json unchanged)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Declare build-time env vars (Vite needs these during `npm run build`)
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID
ARG VITE_STRIPE_PRO_LINK
ARG VITE_APP_URL

# Set them as env vars so Vite picks them up
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ENV VITE_FIREBASE_MEASUREMENT_ID=$VITE_FIREBASE_MEASUREMENT_ID
ENV VITE_STRIPE_PRO_LINK=$VITE_STRIPE_PRO_LINK
ENV VITE_APP_URL=$VITE_APP_URL

RUN npm run build

# ── Stage 2: Serve ───────────────────────────────────────────
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
