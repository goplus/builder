#!/usr/bin/env bash
###########################################
# This script is used to start the application in the PR environment
###########################################
set -ex

echo "WORKSPACE: ${PWD}"

# create ConfigMap
kubectl create configmap goplus-env-config -n goplus-pr-review --from-literal=ALLOWED_ORIGIN='*' \
--from-literal=GOP_SPX_DSN='root:root@tcp(10.212.53.211:3306)/spx?charset=utf8&parseTime=True&loc=Local' \
--from-literal=GOP_SPX_BLOBUS='kodo://OlhSLv3NEGRW9lrAWXfW8hsPMTSfLo7Rc1hBNfzT:0WYaqxdBg4T_XepbMMksx_7z2p31rUkaBcExCuVV@spx1?useHttps' \
--from-literal=SPRITE_PATH='sprite/' \
--from-literal=BACKGROUND_PATH='background/' \
--from-literal=SOUNDS_PATH='sounds/' \
--from-literal=PROJECT_PATH='project/' \
--from-literal=GIF_PATH='gif/' \
--from-literal=QINIU_PATH='http://s91gko6lf.hn-bkt.clouddn.com' \
--from-literal=GOP_CASDOOR_ENDPOINT='https://casdoor-community.qiniu.io' \
--from-literal=GOP_CASDOOR_CLIENTID='389313df51ffd2093b2f' \
--from-literal=GOP_CASDOOR_CLIENTSECRET='bd22db46e4ab52ab0d0ac9cbd771a21775039409' \
--from-literal=GOP_CASDOOR_CERTIFICATE='-----BEGIN CERTIFICATE-----
MIIE3TCCAsWgAwIBAgIDAeJAMA0GCSqGSIb3DQEBCwUAMCgxDjAMBgNVBAoTBWFk
bWluMRYwFAYDVQQDEw1jZXJ0LWJ1aWx0LWluMB4XDTI0MDEyMjAxMjcyM1oXDTQ0
MDEyMjAxMjcyM1owKDEOMAwGA1UEChMFYWRtaW4xFjAUBgNVBAMTDWNlcnQtYnVp
bHQtaW4wggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAwggIKAoICAQC4Qfq85ynOMFbV
vAk+IDnt7B+3N2ntw5udQptjlVMDptDmL2s5J7uguWzf+QcjIYZMR7r8PaSugybf
k5AVaQgHgvM3L8uUhSdLJGRBCfxSUZCAvVV8QbnP1h4oqOn1r1ZEGUvLGUD1WG+0
fCNLhG1xYZE9yOyiJ6uEa/aMavgSswYSay9sc0gCJ0FE0gldFt+T3r3RNxQK3hl9
3i7ifYbvCrdvTHbdVwciUWD9xC6JD2gL7KkNwCmL+PB4+XLZ+6/v4XGfK+OZ6/dN
JuEJg+KR/v5eV7am5vp35mk/9evLYm7cjHHNZ49VIoz1wwHaApDVmRTE/ilGVcZy
Ynxq/mI3bl3PLd/yK6gB1itD97XRf3JUXRjFlvhCZITYPhhMliiGi2cQzp++sxGU
osciNI+CkQRkMOOfJa+2bwexNocfr1d01xkNw02PpRqBKGG2eJVN1pmXQH122bfT
ReLWYQGUOIvwJSX/nqPZU+OI9wQOUOJkA49G/652AOTSphidPY83qiJ1xQ6Qsftj
KHDT7XrN7l00FY7D2L++CwYybpwcfva9VsAsMsd2X+/r9+Qpla1USSfxFuaNFLYI
qZKlHNgqNl7YY+uThzzFjL8x96u2ar8emRDqpE2HCirnqfYmZ5VldWkwJ9wKqRIv
IYaqZAmSs4hJovB+sujgLOKNeTCOkwIDAQABoxAwDjAMBgNVHRMBAf8EAjAAMA0G
CSqGSIb3DQEBCwUAA4ICAQCo3+PvCMnGpY28v+JLFxrxC2aP/ZipUGsBnWGU5Czc
/J2gs7MdNLny0QDVvjEBCIWGu2YkNkii7Z8WskGGDmJCClN6N91aFizfDK+f49LW
7KXnqUztATf848ypPDcbhjcTwtvU8ABo7BLAfNO9TVc4nPLNjXMetojAj8S+n56o
qghbE7UaHd2d2q/ETFqunb8BbBPjw0Fv8VcpuIFrgKFEt+5nq8miYoGrBySPx/CZ
Whm4PZ1HIobFXkfN0FhoX++sArL4FAacisBxqX9HYYnwGYvXzUtmdFNfqctKH2Gt
YiSxoI1Jf9YysAroiIRxWNNr+O+Nkn0iIhkScKhvpXhLMnv1b2MIxwURUUnxehE1
X4OALKxIZNyDvQUHZukzbVNQRJUorg+g4wPuCOkfvbNlHAFZerLxbigN1rafqH1j
Pt/ORY44z+IeU7zc3zW0Gug5ws5X6IWgYwlZODhEVd8jELk180SF0jEMqmbFud0I
SqmP0/koI7IzNhwqLilLWa3pUKs8AOxW4MCff/1fLB9IhR6c5+SG2S7ZbupuxXZS
hLX23sQstIcgUKEhMTger6IyFreuQY3kXDKSSReE6IA9HLUtYdykfUR0oL7pQwMx
ZNIZlCk3CrqUzVnAln07K9++5egCisZ0XADLp1cgCZk0NRM7a2LuMDx/iZXw1QaQ
Iw==
-----END CERTIFICATE-----' \
--from-literal=GOP_CASDOOR_ORGANIZATIONNAME='built-in' \
--from-literal=GOP_CASDOOR_APPLICATONNAME='application_goplusCommunity'

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
          volumeMounts:
            - name: config-volume
              mountPath: /usr/local/bin/.env
              subPath: .env
              readOnly: true
      volumes:
        - name: config-volume
          configMap:
            name: goplus-env-config
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
PREVIEW_URL=http://goplus-builder-pr-${PULL_NUMBER}.goplus-pr-review.svc.jfcs-qa1.local
message=$'The PR environment is ready, please check the [PR environment]('${PREVIEW_URL}')

[Attention]: This environment will be automatically cleaned up after 6 hours, please make sure to test it in time. If you have any questions, please contact the author of the PR or the SPX Builder team. 
'
gh_comment -org=${REPO_OWNER} -repo=${REPO_NAME} -num=${PULL_NUMBER} -p=${PREVIEW_URL} -b "${message}"

