#!/bin/bash
set -e

# Install Golang for project build on Vercel
# Assumes that we are based on [Amazon Linux 2](https://vercel.com/docs/deployments/build-image)

yum -y install wget tar gzip

wget https://go.dev/dl/go1.24.4.linux-amd64.tar.gz
tar -C /usr/local -xzf ./go1.24.4.linux-amd64.tar.gz
/usr/local/go/bin/go version

npm install
