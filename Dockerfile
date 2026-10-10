FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
COPY packages/contracts packages/contracts
RUN npm ci
COPY server server
COPY client client
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ARG VITE_GOOGLE_CLIENT_ID=""
ENV VITE_API_URL=$VITE_API_URL VITE_SOCKET_URL=$VITE_SOCKET_URL VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

FROM node:24-bookworm-slim AS api
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
COPY packages/contracts packages/contracts
RUN npm ci --omit=dev --workspace=server --workspace=@taskflow/contracts
COPY --from=build /app/server/dist server/dist
USER node
WORKDIR /app/server
EXPOSE 5000
CMD ["node", "dist/server.js"]

# Optional frontend image; deploy/nginx.conf assumes an API service named api.
FROM nginx:stable-alpine AS web
COPY --from=build /app/client/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
