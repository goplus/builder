#!/bin/bash

echo "🚀 启动生产环境服务器..."

# 设置环境变量  
export FLASK_ENV=production
export HOST=0.0.0.0
export PORT=8090

# 启动Gunicorn
gunicorn \
  --bind $HOST:$PORT \
  --workers 4 \
  --worker-class sync \
  --timeout 120 \
  --keep-alive 2 \
  --max-requests 1000 \
  --max-requests-jitter 100 \
  --preload \
  --access-logfile logs/access.log \
  --error-logfile logs/error.log \
  --log-level info \
  --pid /tmp/gunicorn.pid \
  run:app

echo "✅ 服务器已启动在 http://$HOST:$PORT"