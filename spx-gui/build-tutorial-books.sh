#!/bin/bash

# GitBook build script (using HonKit)
# Build all subdirectories under tutorial that contain book.json

set -e

# Navigate to project root
cd "$(dirname "$0")/.."

TUTORIAL_DIR="tutorial"
OUTPUT_BASE="spx-gui/public/tutorial-books"

echo "Starting GitBook build..."

built_count=0
skipped_count=0
cached_count=0

# Iterate through all subdirectories under tutorial
for dir in "$TUTORIAL_DIR"/*; do
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
                echo "Building: $dir -> $OUTPUT_DIR"

                # Build GitBook
                cd "$dir"
                npx honkit build . "../../$OUTPUT_DIR"
                cd - > /dev/null

                echo "✓ Completed: $DIR_NAME"
                built_count=$((built_count + 1))
            else
                echo "↻ Cached: $DIR_NAME (up-to-date)"
                cached_count=$((cached_count + 1))
            fi
        else
            echo "⊘ Skipped: $(basename "$dir") (book.json not found)"
            skipped_count=$((skipped_count + 1))
        fi
    fi
done

echo ""
echo "GitBook build completed!"
echo "Built: $built_count, Cached: $cached_count, Skipped: $skipped_count"
echo "Access path: /tutorial-books/<directory-name>"
