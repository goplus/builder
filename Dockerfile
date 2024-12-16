# All-in-one Dockerfile for building the SPX GUI

ARG GOP_BASE_IMAGE=ghcr.io/goplus/gop:1.2
ARG GO_BASE_IMAGE=golang:1.23.4
ARG NODE_BASE_IMAGE=node:20.11.1
ARG NGINX_BASE_IMAGE=nginx:1.27

FROM ${GOP_BASE_IMAGE} AS gop-builder

WORKDIR /app

COPY tools ./tools
COPY spx-backend ./spx-backend

ARG GOPROXY

# Build WASM
WORKDIR /app/tools/fmt
RUN ./build.sh
WORKDIR /app/tools/ispx
RUN ./build.sh

# Build backend
WORKDIR /app/spx-backend
RUN gop build -o spx-backend ./cmd/spx-backend

FROM ${GO_BASE_IMAGE} AS go-builder

# Build WASM for spxls
WORKDIR /app/tools/spxls
RUN ./build.sh

FROM ${NODE_BASE_IMAGE} AS frontend-builder

WORKDIR /app/spx-gui

COPY spx-gui/package.json spx-gui/package-lock.json ./

ARG NPM_CONFIG_REGISTRY

RUN npm install

COPY spx-gui .
COPY docs ../docs
COPY tools ../tools
COPY --from=gop-builder /app/tools/fmt/static/main.wasm /app/spx-gui/src/assets/format.wasm
COPY --from=gop-builder /app/tools/ispx/main.wasm /app/spx-gui/src/assets/ispx/main.wasm
COPY --from=go-builder /app/tools/spxls/spxls.wasm /app/spx-gui/src/assets/spxls.wasm

ARG NODE_ENV

RUN npm run build

FROM ${NGINX_BASE_IMAGE}

COPY --from=gop-builder /app/spx-backend/spx-backend /app/spx-backend/spx-backend
COPY --from=frontend-builder /app/spx-gui/dist /usr/share/nginx/html
COPY scripts/nginx.conf /etc/nginx/conf.d/default.conf

# Compress WASM files for gzip_static
RUN find /usr/share/nginx/html -name "*.wasm" -exec gzip -9 -k {} \;

EXPOSE 80

WORKDIR /app

CMD ["sh", "-c", "nginx && exec ./spx-backend/spx-backend"]
