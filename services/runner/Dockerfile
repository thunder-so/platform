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
    python3 \
    ca-certificates

RUN apk add --no-cache \
    docker-cli \
    aws-cli \
    fnm
    
ENV SHELL=/bin/bash
RUN echo 'eval "$(fnm env --shell bash)"' >> ~/.bashrc
RUN source ~/.bashrc && \
    fnm install 20 --corepack-enabled && \
    fnm install 22 --corepack-enabled && \
    fnm install 24 --corepack-enabled && \
    fnm default 24

# Install Yarn (via corepack, included with Node)
RUN source ~/.bashrc && corepack prepare yarn@stable --activate

# Install pnpm
RUN curl -fsSL https://get.pnpm.io/install.sh | bash

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash

# Verify everything works
RUN source ~/.bashrc && \
    node --version && \
    npm --version && \
    corepack --version && \
    pnpm --version && \
    yarn --version && \
    bun --version

RUN rm -rf /var/cache/apk/*

# Default command
CMD ["bash", "-c"]