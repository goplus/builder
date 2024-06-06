# All-in-one Dockerfile for building the SPX GUI

FROM aslan-spock-register.qiniu.io/goplus/golang:1.21 as go-builder

WORKDIR /app

# Build WASM
COPY tools ./tools
COPY spx-backend ./spx-backend

WORKDIR /app/tools/fmt
RUN ./build.sh

WORKDIR /app/tools/ispx
RUN ./build.sh

# Install Go+
RUN bash -c ' echo "deb [trusted=yes] https://pkgs.goplus.org/apt/ /" > /etc/apt/sources.list.d/goplus.list' \
    && apt update \
    && apt install -y gop

# Build backend
WORKDIR /app/spx-backend
RUN gop build -o spx-backend ./cmd/spx-backend

FROM aslan-spock-register.qiniu.io/goplus/node:20.11.1 as frontend-builder

WORKDIR /app/spx-gui

COPY spx-gui/package.json spx-gui/package-lock.json ./

RUN npm install

COPY spx-gui .
# Required to resolve symlinks
COPY tools ../tools
COPY --from=go-builder /app/tools/fmt/static/main.wasm /app/spx-gui/src/assets/format.wasm
COPY --from=go-builder /app/tools/ispx/main.wasm /app/spx-gui/src/assets/ispx/main.wasm

RUN npm run build

FROM go-builder

# Install nginx
RUN apt update && apt install -y nginx

COPY --from=frontend-builder /app/spx-gui/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/sites-available/default

# Compress WASM files for gzip_static
RUN find /usr/share/nginx/html -name "*.wasm" -exec gzip -9 -k {} \;

EXPOSE 80

WORKDIR /app

CMD ./spx-backend/spx-backend & nginx -g "daemon off;" & wait
