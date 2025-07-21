#!/bin/bash
set -e

echo "🔧 Setting up Prisma for production..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Create database directory if it doesn't exist
mkdir -p /tmp

# Set database URL to a writable location on Vercel
export DATABASE_URL="file:/tmp/prod.db"

# Deploy migrations (create tables)
echo "🗃️ Running database migrations..."
npx prisma migrate deploy

echo "🏗️ Building Remix app..."
npx remix vite:build

echo "✅ Build completed successfully!"