# Use the provided runtime version to fetch base image
# https://gallery.ecr.aws/docker/library/node
FROM public.ecr.aws/docker/library/alpine:latest

# Add repos 
RUN echo "http://dl-cdn.alpinelinux.org/alpine/edge/testing/" >> /etc/apk/repositories && \
    echo "http://dl-cdn.alpinelinux.org/alpine/edge/community/" >> /etc/apk/repositories && \
    apk update

# Install deps
RUN apk add --no-cache \
    bash \
    curl \
    git \
    zip \
    tar \
    python3 \
    ca-certificates

RUN apk add --no-cache \
    docker-cli \
    docker-cli-buildx \
    py3-pip \
    fnm

# Install aws-cli via pip (compatible with Python 3.12)
RUN pip3 install --no-cache-dir awscli --break-system-packages

# Enable BuildKit by default
ENV DOCKER_BUILDKIT=1
ENV DOCKER_CLI_EXPERIMENTAL=enabled
    
ENV SHELL=/bin/bash
RUN echo 'eval "$(fnm env --shell bash)"' >> ~/.bashrc
RUN source ~/.bashrc && \
    fnm install 20 --corepack-enabled && \
    fnm install 22 --corepack-enabled && \
    fnm install 24 --corepack-enabled && \
    fnm default 24

# Install Yarn and PNPM (via corepack, included with Node)
RUN source ~/.bashrc && \
    corepack prepare yarn@stable --activate && \
    corepack prepare pnpm@latest --activate

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash

# Install Nixpacks
RUN curl -sSL https://nixpacks.com/install.sh | bash

# Verify everything works
RUN source ~/.bashrc && \
    node --version && \
    npm --version && \
    pnpm --version && \
    yarn --version && \
    bun --version && \
    nixpacks --version

RUN rm -rf /var/cache/apk/*

# Default command
CMD ["bash", "-c"]