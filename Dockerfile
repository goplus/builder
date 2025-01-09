# All-in-one Dockerfile for building the SPX GUI

ARG GOP_BASE_IMAGE=ghcr.io/goplus/gop:1.2
ARG GO_BASE_IMAGE=golang:1.23.4
ARG NODE_BASE_IMAGE=node:20.11.1
ARG NGINX_BASE_IMAGE=nginx:1.27

################################################################################

FROM ${GOP_BASE_IMAGE} AS gop-builder

WORKDIR /app

COPY tools ./tools
COPY spx-backend ./spx-backend

ARG GOPROXY

# Build backend
WORKDIR /app/spx-backend
RUN gop build -trimpath -o spx-backend ./cmd/spx-backend

################################################################################

FROM ${GO_BASE_IMAGE} AS go-builder

ARG GOPROXY
# Pre-install Go toolchain for 1.21.3, which will be used by tools/ispx
RUN GOTOOLCHAIN=go1.21.3 go version

WORKDIR /app
COPY tools ./tools
COPY spx-gui ./spx-gui

# Build WASM
WORKDIR /app/spx-gui
RUN ./build-wasm.sh

################################################################################

FROM ${NODE_BASE_IMAGE} AS frontend-builder

WORKDIR /app/spx-gui

COPY spx-gui/package.json spx-gui/package-lock.json .
ARG NPM_CONFIG_REGISTRY
RUN npm install

COPY spx-gui/public ./public
COPY spx-gui/install-spx.sh .
RUN ./install-spx.sh

COPY spx-gui .
COPY docs ../docs
COPY tools ../tools
# Copy assets (with wasm)
COPY --from=go-builder /app/spx-gui/src/assets /app/spx-gui/src/assets

ARG NODE_ENV

RUN npm run build

################################################################################

FROM ${NGINX_BASE_IMAGE}

COPY --from=gop-builder /app/spx-backend/spx-backend /app/spx-backend/spx-backend
COPY --from=frontend-builder /app/spx-gui/dist /usr/share/nginx/html
COPY scripts/nginx.conf /etc/nginx/conf.d/default.conf

# Compress WASM files for gzip_static
RUN find /usr/share/nginx/html -name "*.wasm" -exec gzip -9 -k {} \;

EXPOSE 80

WORKDIR /app

CMD ["sh", "-c", "nginx && exec ./spx-backend/spx-backend"]
