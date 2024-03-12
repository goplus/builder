#!/usr/bin/env bash
###########################################
# This script is used to start the application in the PR environment
###########################################
set -ex

echo "WORKSPACE: ${PWD}"

PREVIEW_URL=http://goplus-builder-pr-${PULL_NUMBER}.goplus-pr-review.svc.jfcs-qa1.local

echo VITE_PUBLISH_BASE_URL=${PREVIEW_URL}/ > spx-gui/.env.local
export CONTAINER_IMAGE=aslan-spock-register.qiniu.io/goplus/goplus-builder-pr:${PULL_NUMBER}-${PULL_PULL_SHA:0:8}
docker build -t ${CONTAINER_IMAGE} -f ./Dockerfile . --builder="kube" --push

# generate kubernetes yaml with unique flag for PR
cat > builder.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: goplus-builder-pr-${PULL_NUMBER}
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

[Attention]: This environment will be automatically cleaned up after 6 hours, please make sure to test it in time. If you have any questions, please contact the author of the PR or the SPX Builder team. 
'
gh_comment -org=${REPO_OWNER} -repo=${REPO_NAME} -num=${PULL_NUMBER} -p=${PREVIEW_URL} -b "${message}"

