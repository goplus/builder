# All-in-one Dockerfile for building the SPX GUI
# TODO: build backend.

FROM golang:1.21 as wasm-builder

WORKDIR /wasm

COPY tools .

WORKDIR /wasm/fmt
RUN ./build.sh

WORKDIR /wasm/ispx
RUN ./build.sh

FROM node:latest as frontend-builder

WORKDIR /app

COPY . .

WORKDIR /app/spx-gui

RUN npm install

COPY --from=wasm-builder /wasm/fmt/static/main.wasm /app/spx-gui/src/assets/format.wasm
COPY --from=wasm-builder /wasm/ispx/main.wasm /app/spx-gui/src/assets/ispx/main.wasm

RUN npm run build

FROM nginx:stable

COPY --from=frontend-builder /app/spx-gui/dist /usr/share/nginx/html
COPY --from=frontend-builder /app/spx-gui/nginx.conf /etc/nginx/conf.d/default.conf

# Compress WASM files for gzip_static
RUN find /usr/share/nginx/html -name "*.wasm" -exec gzip -9 -k {} \;

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
