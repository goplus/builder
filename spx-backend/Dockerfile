FROM ubuntu:22.04

RUN apt update -y 

RUN apt install -y \
    wget \
    curl \
    git
#     build-essential

RUN wget https://golang.org/dl/go1.19.linux-amd64.tar.gz && \
    tar -C /usr/local -xzf go1.19.linux-amd64.tar.gz && \
    rm go1.19.linux-amd64.tar.gz

ENV PATH="/usr/local/go/bin:${PATH}"

# RUN go version

RUN mkdir usr/local/gop

RUN wget https://github.com/goplus/gop/releases/download/v1.2.0-pre.2/gop_v1.2.0-pre.2_Linux_arm64.tar.gz && \
    tar -C /usr/local/gop -xzf gop_v1.2.0-pre.2_Linux_arm64.tar.gz && \ 
    rm gop_v1.2.0-pre.2_Linux_arm64.tar.gz 

ENV PATH="/usr/local/gop/bin:${PATH}"

# RUN gop version

WORKDIR /app

COPY . .

WORKDIR /app/cmd

RUN gop build .

EXPOSE 8081

CMD ["./cmd"]

