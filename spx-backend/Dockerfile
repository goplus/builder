# Use Ubuntu 22.04 as the base image for the build stage
FROM ubuntu:22.04 as builder

# Install build dependencies
RUN apt update -y && apt install -y wget curl git

# Install Go
RUN wget https://golang.org/dl/go1.20.linux-amd64.tar.gz && \
    tar -C /usr/local -xzf go1.20.linux-amd64.tar.gz && \
    rm go1.20.linux-amd64.tar.gz
ENV PATH="/usr/local/go/bin:${PATH}"

# Install Go+
RUN mkdir /usr/local/gop && \
    wget https://github.com/goplus/gop/releases/download/v1.2.1/gop_v1.2.1_Linux_x86_64.tar.gz && \
    tar -C /usr/local/gop -xzf gop_v1.2.1_Linux_x86_64.tar.gz && \
    rm gop_v1.2.1_Linux_x86_64.tar.gz
ENV PATH="/usr/local/gop/bin:${PATH}"

# Set the working directory and copy the source code
WORKDIR /app
COPY . .

# Build the application
WORKDIR /app/cmd
RUN gop build -o myapp .

# Use a new lightweight image
FROM ubuntu:22.04

# Copy the built application to the new image
COPY --from=builder /app/cmd/myapp /app/myapp

# Set the working directory
WORKDIR /app

# Expose the port
EXPOSE 8080

# Set the container startup command
CMD ["./myapp"]