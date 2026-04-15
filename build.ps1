docker run --rm -v "${PSScriptRoot}:/app" -w /app node:20-alpine sh -c "npm install && npm run build"
