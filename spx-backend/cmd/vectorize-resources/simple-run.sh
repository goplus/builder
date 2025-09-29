#!/bin/bash

# Asset Vectorization Tool Runner

set -e

echo "🚀 Asset Vectorization Tool"

# Load environment variables
ENV_FILE="../../.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: .env file not found at $ENV_FILE"
    exit 1
fi

# Extract specific environment variables we need
export GOP_SPX_DSN=$(grep "^GOP_SPX_DSN=" "$ENV_FILE" | cut -d'=' -f2)
export ALGORITHM_ENDPOINT=$(grep "^ALGORITHM_ENDPOINT=" "$ENV_FILE" | cut -d'=' -f2)
export KODO_AK=$(grep "^KODO_AK=" "$ENV_FILE" | cut -d'=' -f2)
export KODO_SK=$(grep "^KODO_SK=" "$ENV_FILE" | cut -d'=' -f2)
export KODO_BUCKET=$(grep "^KODO_BUCKET=" "$ENV_FILE" | cut -d'=' -f2)
export KODO_BUCKET_REGION=$(grep "^KODO_BUCKET_REGION=" "$ENV_FILE" | cut -d'=' -f2)
export KODO_BASE_URL=$(grep "^KODO_BASE_URL=" "$ENV_FILE" | cut -d'=' -f2)

echo "✅ Environment variables loaded:"
echo "📍 Database: ${GOP_SPX_DSN:0:30}..."
echo "📍 Algorithm: $ALGORITHM_ENDPOINT"
echo "📍 Kodo AK: ${KODO_AK:0:10}..."
echo "📍 Kodo Bucket: $KODO_BUCKET"
echo "📍 Kodo Region: $KODO_BUCKET_REGION"
echo ""

# Build if needed
if [ ! -f "./vectorize-resources" ]; then
    echo "🔨 Building vectorize-resources..."
    go build -o vectorize-resources .
    echo "✅ Build completed"
    echo ""
fi

# Run the tool with passed arguments
echo "🎯 Starting vectorization..."
./vectorize-resources "$@"