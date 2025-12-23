#!/bin/bash

# GitBook build script (using HonKit)
# Build all subdirectories under tutorial that contain book.json

set -e

# Navigate to project root
cd "$(dirname "$0")/.."

TUTORIAL_DIR="tutorial"
OUTPUT_BASE="spx-gui/public/books"

echo "Starting GitBook build..."

# Check if honkit is installed
if ! command -v honkit &> /dev/null; then
    echo "HonKit not installed, installing..."
    npm install -g honkit
fi

# Iterate through all subdirectories under tutorial
for dir in "$TUTORIAL_DIR"/*; do
    if [ -d "$dir" ]; then
        # Check if book.json exists
        if [ -f "$dir/book.json" ]; then
            DIR_NAME=$(basename "$dir")
            OUTPUT_DIR="$OUTPUT_BASE/$TUTORIAL_DIR/$DIR_NAME"
            
            echo "Building: $dir -> $OUTPUT_DIR"
            
            # Build GitBook
            cd "$dir"
            honkit build . "../../$OUTPUT_DIR"
            cd - > /dev/null
            
            echo "✓ Completed: $DIR_NAME"
        else
            echo "⊘ Skipped: $(basename "$dir") (book.json not found)"
        fi
    fi
done

echo ""
echo "GitBook build completed!"
echo "Access path: /books/$TUTORIAL_DIR/<directory-name>"
