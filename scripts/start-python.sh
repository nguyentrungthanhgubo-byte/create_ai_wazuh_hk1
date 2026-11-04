#!/usr/bin/env bash

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$PROJECT_DIR/python"

if [ ! -d "$PROJECT_DIR/.venv" ]; then
    echo "Python virtual environment not found."
    exit 1
fi

source "$PROJECT_DIR/.venv/bin/activate"

echo "Starting Python AI Backend..."

exec uvicorn server:app \
    --host 127.0.0.1 \
    --port 5001