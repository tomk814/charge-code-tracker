#!/usr/bin/env bash
docker run --rm -v "$(dirname "$0"):/app" -w /app node:20-alpine sh -c "npm install && npm run build"
