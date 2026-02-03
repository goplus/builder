#!/bin/bash

# GitBook build script (using HonKit)
# Build all subdirectories that contain book.json

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Default output base (can be overridden by environment variable or argument)
OUTPUT_BASE="${OUTPUT_DIR:-$SCRIPT_DIR/../spx-gui/public/tutorial-books}"
# Convert to absolute path
OUTPUT_BASE="$(cd "$(dirname "$OUTPUT_BASE")" && pwd)/$(basename "$OUTPUT_BASE")"

# Install dependencies if needed
if [ -f "package.json" ] && [ ! -d "node_modules" ]; then
    echo "Installing tutorial dependencies..."
    npm install
fi

# Iterate through all subdirectories
for dir in */; do
    if [ -d "$dir" ]; then
        # Check if book.json exists
        if [ -f "$dir/book.json" ]; then
            DIR_NAME=$(basename "$dir")
            OUTPUT_DIR="$OUTPUT_BASE/$DIR_NAME"

            # Check if output exists and is up-to-date
            needs_rebuild=false

            if [ ! -d "$OUTPUT_DIR" ] || [ ! -f "$OUTPUT_DIR/index.html" ]; then
                # Output doesn't exist, need to build
                needs_rebuild=true
            else
                # Check if any source file is newer than the output
                newest_source=$(find "$dir" -type f -newer "$OUTPUT_DIR/index.html" 2>/dev/null | head -n 1)
                if [ -n "$newest_source" ]; then
                    needs_rebuild=true
                fi
            fi

            if [ "$needs_rebuild" = true ]; then
                # Build GitBook
                npx honkit build "$DIR_NAME" "$OUTPUT_DIR"
            fi
        fi
    fi
done

echo ""
echo "GitBook build completed!"
