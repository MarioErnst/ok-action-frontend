#!/bin/sh
# Inject the backend URL at runtime so no rebuild is needed to change it.
# Uses the __APP_API_URL__ global that client.ts already checks before VITE_API_URL.
API_URL="${VITE_API_URL:-/api}"
sed -i "s|</head>|<script>window.__APP_API_URL__='${API_URL}'</script></head>|" /app/dist/index.html
exec serve -s dist -l "${PORT:-8080}"
