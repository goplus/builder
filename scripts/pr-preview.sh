#!/usr/bin/env bash
###########################################
# This script is used to start the application in the PR environment
###########################################
set -ex

echo "WORKSPACE: ${PWD}"

PREVIEW_URL="http://goplus-builder-pr-${PULL_NUMBER}.goplus-pr-review.svc.jfcs-qa1.local"

echo "VITE_PUBLISH_BASE_URL=${PREVIEW_URL}/" > spx-gui/.env.staging.local

GOPLUS_REGISTRY_REPO=aslan-spock-register.qiniu.io/goplus
CONTAINER_IMAGE="${GOPLUS_REGISTRY_REPO}/goplus-builder-pr:${PULL_NUMBER}-${PULL_PULL_SHA:0:8}"
docker build \
	--builder kube \
	--push \
	-f ./Dockerfile \
	-t "${CONTAINER_IMAGE}" \
	--build-arg GOP_BASE_IMAGE="${GOPLUS_REGISTRY_REPO}/gop:1.2" \
	--build-arg NODE_BASE_IMAGE="${GOPLUS_REGISTRY_REPO}/node:20.11.1" \
	--build-arg NGINX_BASE_IMAGE="${GOPLUS_REGISTRY_REPO}/nginx:1.27" \
	--build-arg GOPROXY=https://goproxy.cn,direct \
	--build-arg NPM_CONFIG_REGISTRY=https://registry.npmmirror.com \
	--build-arg NODE_ENV=staging \
	.

CURRENT_TIME="$(date "--iso-8601=seconds")"
# generate kubernetes yaml with unique flag for PR
cat > builder.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: goplus-builder-pr-${PULL_NUMBER}
  labels:
    sleepmode.kubefree.com/delete-after: "144h"
  annotations:
    sleepmode.kubefree.com/activity-status: '{"LastActivityTime": "${CURRENT_TIME}"}'
spec:
  replicas: 1
  selector:
    matchLabels:
      app: goplus-builder-pr-${PULL_NUMBER}
  template:
    metadata:
      labels:
        app: goplus-builder-pr-${PULL_NUMBER}
    spec:
      containers:
        - name: my-container
          image: ${CONTAINER_IMAGE}
          ports:
            - containerPort: 80
---            
apiVersion: v1
kind: Service
metadata:
  name: goplus-builder-pr-${PULL_NUMBER}
  labels:
    sleepmode.kubefree.com/delete-after: "144h"
  annotations:
    sleepmode.kubefree.com/activity-status: '{"LastActivityTime": "${CURRENT_TIME}"}'
spec:
  selector:
    app: goplus-builder-pr-${PULL_NUMBER}
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: ClusterIP
EOF

kubectl -n goplus-pr-review apply -f builder.yaml 

kubectl -n goplus-pr-review get pods

# comment on the PR
message=$'The PR environment is ready, please check the [PR environment]('${PREVIEW_URL}')

[Attention]: This environment will be automatically cleaned up after a certain period of time., please make sure to test it in time. If you have any questions, please contact the builder team.
'
gh_comment -org=${REPO_OWNER} -repo=${REPO_NAME} -num=${PULL_NUMBER} -p=${PREVIEW_URL} -b "${message}"

