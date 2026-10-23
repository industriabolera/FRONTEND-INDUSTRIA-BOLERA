# Imagen de producción multi-stage para ILB (Coolify / buildpack Docker).
FROM node:20.20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: evita que `postinstall` compile antes de tener el código fuente.
RUN npm ci --ignore-scripts

FROM node:20.20-bookworm-slim AS build
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Ejecuta prebuild (generate-blog) + vite build.
RUN npm run build

FROM node:20.20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001
COPY package.json package-lock.json ./
# --ignore-scripts: `postinstall` compilaría en runtime y sin devDependencies.
RUN npm ci --omit=dev --ignore-scripts
# dist/ debe existir: si falta, server.js recompila en runtime.
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js /app/app.js ./
COPY --from=build /app/server ./server
# server/index.js importa src/ y netlify/functions/lib/ en runtime (Vite no los bundlea).
COPY --from=build /app/src ./src
COPY --from=build /app/netlify/functions/lib ./netlify/functions/lib
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3001) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "app.js"]
