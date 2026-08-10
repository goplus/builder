# All-in-one Dockerfile for building the SPX GUI

ARG GO_BASE_IMAGE=golang:1.25.8
ARG NODE_BASE_IMAGE=node:24.11.1
ARG NGINX_BASE_IMAGE=nginx:1.27

################################################################################

FROM ${GO_BASE_IMAGE} AS go-builder

ARG GOPROXY

WORKDIR /app
COPY tools ./tools
COPY spx-gui ./spx-gui

# Build WASM
WORKDIR /app/spx-gui
RUN ./build-wasm.sh

################################################################################

FROM ${NODE_BASE_IMAGE} AS frontend-builder

WORKDIR /app/spx-gui

COPY spx-gui/package.json spx-gui/pnpm-lock.yaml spx-gui/pnpm-workspace.yaml .
COPY spx-gui/public ./public
COPY spx-gui/link-spx.sh .
COPY spx-gui/build-tutorial-books.sh .
ARG NPM_CONFIG_REGISTRY
# pnpm reads npm config from lowercase npm_config_* environment variables.
ENV npm_config_registry=${NPM_CONFIG_REGISTRY}
RUN corepack enable && pnpm install --frozen-lockfile

COPY spx-gui .
COPY docs ../docs
COPY tools ../tools
COPY tutorial ../tutorial
# Copy assets (with wasm)
COPY --from=go-builder /app/spx-gui/src/assets /app/spx-gui/src/assets

ARG VITE_MODE

ENV NODE_OPTIONS=--max-old-space-size=4096
RUN pnpm run build

################################################################################

FROM ${NGINX_BASE_IMAGE}

COPY --from=frontend-builder /app/spx-gui/dist /usr/share/nginx/html
COPY spx-gui/build/nginx.conf /etc/nginx/conf.d/default.conf

# Validate Nginx configuration
RUN nginx -t

# Compress WASM files for gzip_static
RUN find /usr/share/nginx/html -name "*.wasm" -exec gzip -9 -k {} \;

EXPOSE 80

WORKDIR /app

CMD ["nginx", "-g", "daemon off;"]
