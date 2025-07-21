#!/bin/bash
set -e

echo "🏗️ Building Remix app with memory session storage..."

# Generate Prisma client (still needed for metafields storage service)
echo "📦 Generating Prisma client..."
npx prisma generate

# Build the Remix app
echo "🏗️ Building Remix app..."
npx remix vite:build

echo "✅ Build completed successfully!"