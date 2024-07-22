# All-in-one Dockerfile for building the SPX GUI

ARG image_address
FROM ghcr.io/goplus/gop:1.2 AS go-builder

WORKDIR /app

COPY tools ./tools
COPY spx-backend ./spx-backend

# Build WASM
WORKDIR /app/tools/fmt
RUN ./build.sh
WORKDIR /app/tools/ispx
RUN ./build.sh

# Build backend
WORKDIR /app/spx-backend
RUN gop build -o spx-backend ./cmd/spx-backend

FROM ${image_address}node:20.11.1 AS frontend-builder

WORKDIR /app/spx-gui

COPY spx-gui/package.json spx-gui/package-lock.json ./

RUN npm install

COPY spx-gui .
# Required to resolve symlinks
COPY tools ../tools
COPY --from=go-builder /app/tools/fmt/static/main.wasm /app/spx-gui/src/assets/format.wasm
COPY --from=go-builder /app/tools/ispx/main.wasm /app/spx-gui/src/assets/ispx/main.wasm

RUN npm run build

FROM ${image_address}nginx:1.27

COPY --from=go-builder /app/spx-backend/spx-backend /app/spx-backend/spx-backend
COPY --from=frontend-builder /app/spx-gui/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Compress WASM files for gzip_static
RUN find /usr/share/nginx/html -name "*.wasm" -exec gzip -9 -k {} \;

EXPOSE 80

WORKDIR /app

CMD ["sh", "-c", "nginx && ./spx-backend/spx-backend"]
