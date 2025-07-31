#!/usr/bin/env bash
###########################################
# This script is used to start the application in the PR environment
###########################################
set -ex

echo "WORKSPACE: ${PWD}"

# Configure spx-gui to use co-located spx-backend
echo "VITE_API_BASE_URL=/api" > ./spx-gui/.env.staging.local

GOPLUS_REGISTRY_REPO=aslan-spock-register.qiniu.io/goplus
CONTAINER_IMAGE="${GOPLUS_REGISTRY_REPO}/xbuilder-pr:${PULL_NUMBER}-${PULL_PULL_SHA:0:8}"
docker build \
	--builder kube \
	--push \
	-f ./Dockerfile \
	-t "${CONTAINER_IMAGE}" \
	--build-arg XGO_BASE_IMAGE="${GOPLUS_REGISTRY_REPO}/xgo:1.5.0" \
	--build-arg GO_BASE_IMAGE="${GOPLUS_REGISTRY_REPO}/golang:1.24.4" \
	--build-arg NODE_BASE_IMAGE="${GOPLUS_REGISTRY_REPO}/node:20.11.1" \
	--build-arg NGINX_BASE_IMAGE="${GOPLUS_REGISTRY_REPO}/nginx:1.27-dev" \
	--build-arg GOPROXY=https://goproxy.cn,direct \
	--build-arg NPM_CONFIG_REGISTRY=https://registry.npmmirror.com \
	--build-arg NODE_ENV=staging \
	.

CURRENT_TIME="$(date "--iso-8601=seconds")"
# generate kubernetes yaml with unique flag for PR
cat > xbuilder.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: xbuilder-pr-${PULL_NUMBER}
  labels:
    sleepmode.kubefree.com/delete-after: "144h"
  annotations:
    sleepmode.kubefree.com/activity-status: '{"LastActivityTime": "${CURRENT_TIME}"}'
spec:
  selector:
    matchLabels:
      app: xbuilder-pr-${PULL_NUMBER}
  template:
    metadata:
      labels:
        app: xbuilder-pr-${PULL_NUMBER}
    spec:
      containers:
        - name: xbuilder
          image: ${CONTAINER_IMAGE}
          ports:
            - containerPort: 80
          volumeMounts:
            - name: spx-backend-data
              mountPath: /app/.env
              subPath: .env
      volumes:
        - name: spx-backend-data
          configMap:
            name: spx-backend
            items:
              - key: .env
                path: .env
---
apiVersion: v1
kind: Service
metadata:
  name: xbuilder-pr-${PULL_NUMBER}
  labels:
    sleepmode.kubefree.com/delete-after: "144h"
  annotations:
    sleepmode.kubefree.com/activity-status: '{"LastActivityTime": "${CURRENT_TIME}"}'
spec:
  selector:
    app: xbuilder-pr-${PULL_NUMBER}
  ports:
    - port: 80
EOF

kubectl -n goplus-pr-review apply -f xbuilder.yaml
kubectl -n goplus-pr-review get pod

PREVIEW_URL="http://xbuilder-pr-${PULL_NUMBER}.goplus-pr-review.svc.jfcs-qa1.local"
COMMENT=$'
This PR has been deployed to the preview environment. You can explore it using the [preview URL]('${PREVIEW_URL}').

> [!WARNING]
> Please note that deployments in the preview environment are temporary and will be automatically cleaned up after a certain period. Make sure to explore it before it is removed. For any questions, contact the XBuilder team.
'
gh_comment -org="${REPO_OWNER}" -repo="${REPO_NAME}" -num="${PULL_NUMBER}" -p="${PREVIEW_URL}" -b "${COMMENT}"
