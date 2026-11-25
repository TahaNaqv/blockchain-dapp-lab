# Production image for the backend. Build from the repository root:
#   docker build -f backend/Dockerfile -t voting-backend .
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY contracts/package.json contracts/
COPY frontend/package.json frontend/
RUN npm ci -w backend --ignore-scripts
COPY backend backend
RUN npm run build -w backend && npm prune -w backend --omit=dev --ignore-scripts

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/backend/prisma.config.ts ./backend/prisma.config.ts
WORKDIR /app/backend
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:4000/health || exit 1
# Apply pending migrations, then start the API + indexer.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
