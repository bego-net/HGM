#!/usr/bin/env bash
# Download PocketBase binary for Linux or macOS (amd64) into this folder
set -e
mkdir -p "$(pwd)"
OS=$(uname -s)
ARCH=amd64

if [ "$OS" = "Linux" ]; then
  URL="https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_linux_amd64.zip"
elif [ "$OS" = "Darwin" ]; then
  URL="https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_macos_amd64.zip"
else
  echo "Unsupported OS: $OS. Use download_pb.ps1 on Windows." >&2
  exit 1
fi

TMPZIP="/tmp/pocketbase_$$.zip"
echo "Downloading PocketBase from: $URL"
curl -L -o "$TMPZIP" "$URL"
unzip -o "$TMPZIP" -d .
rm "$TMPZIP"
chmod +x pocketbase
echo "PocketBase binary downloaded to: $(pwd)/pocketbase"
