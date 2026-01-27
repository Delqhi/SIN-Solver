#!/bin/bash
# 🚀 CEO 2026: DOCKER SOVEREIGNTY - IMAGE PERSISTENCE V1.0
# Automates 'docker save' for local image persistence across the 17-room fortress.

PROJECT_NAME="SIN-Solver"
SAVE_DIR="/Users/jeremy/dev/SIN-Code/Docker/$PROJECT_NAME/images"

mkdir -p "$SAVE_DIR"

echo "💾 [CEO] Starting Image Persistence Routine for $PROJECT_NAME..."

# Get all running containers for this project
CONTAINERS=$(docker ps --filter "name=$PROJECT_NAME" --format "{{.Image}}")

if [ -z "$CONTAINERS" ]; then
    echo "⚠️ [CEO] No active containers found for $PROJECT_NAME. Skipping."
    exit 0
fi

for IMAGE in $CONTAINERS; do
    SAFE_NAME=$(echo "$IMAGE" | sed 's/[\/:]/_/g')
    TARGET="$SAVE_DIR/${SAFE_NAME}.tar"
    
    if [ ! -f "$TARGET" ]; then
        echo "📦 [CEO] Saving $IMAGE to $TARGET..."
        docker save "$IMAGE" -o "$TARGET"
    else
        echo "✅ [CEO] Image $IMAGE already persisted at $TARGET."
    fi
done

echo "🏁 [CEO] Infrastructure Sovereignty synchronized."
