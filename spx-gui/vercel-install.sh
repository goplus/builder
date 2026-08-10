#!/bin/bash
set -e

# Install Golang for project build on Vercel
# Assumes that we are based on [Amazon Linux 2](https://vercel.com/docs/deployments/build-image)

yum -y install wget tar gzip

wget https://go.dev/dl/go1.25.8.linux-amd64.tar.gz
tar -C /usr/local -xzf ./go1.25.8.linux-amd64.tar.gz
/usr/local/go/bin/go version

corepack enable
# Vercel may select pnpm 9 by default, which ignores our required pnpm 11 setup.
corepack pnpm@11.9.0 install --frozen-lockfile
