#!/bin/bash
# save_room.sh - Module 22
# Usage: ./save_room.sh <container_name>

ROOM_ID=$1
TIMESTAMP=$(date +%Y%m%d_%H%M)
PROJECT_NAME="Delqhi-Platform"
TARGET="/Users/jeremy/dev/SIN-Code/Docker/${PROJECT_NAME}/images"

if [ -z "$ROOM_ID" ]; then
  echo "Usage: $0 <container_name>"
  exit 1
fi

if ! command -v pigz &> /dev/null; then
    echo "Error: pigz is not installed. Please install it (brew install pigz)."
    exit 1
fi

mkdir -p "$TARGET"
echo "Freezing ${ROOM_ID} state..."
docker commit "${ROOM_ID}" "${ROOM_ID}:${TIMESTAMP}"
docker save "${ROOM_ID}:${TIMESTAMP}" | pigz -c > "${TARGET}/${ROOM_ID}_${TIMESTAMP}.tar.gz"
echo "✅ Room preserved at ${TARGET}/${ROOM_ID}_${TIMESTAMP}.tar.gz"
