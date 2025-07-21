#!/bin/bash

# Deploy script for GraphQL fix
echo "🚀 Deploying GraphQL fix for settings..."

# Ensure we're on the right branch
echo "📍 Current branch:"
git branch --show-current

# Check if there are uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    echo "⚠️  There are uncommitted changes. Committing them..."
    git add .
    git commit -m "Fix: Update ShopifyStorageService to use admin.graphql instead of shopify.graphql

- Fixed TypeError: shopify.graphql is not a function
- Updated constructor to accept admin client
- Updated all route handlers to pass admin client
- Added comprehensive integration tests
- Fixed settings save functionality"
fi

# Push to main branch
echo "📤 Pushing to main branch..."
git push origin main

# Deploy to Vercel (if using Vercel CLI)
if command -v vercel &> /dev/null; then
    echo "🌐 Deploying to Vercel..."
    vercel --prod
else
    echo "ℹ️  Vercel CLI not found. Deployment will happen automatically via Git integration."
fi

echo "✅ Deployment initiated! Check Vercel dashboard for status."
echo "🔗 Production URL: https://fingrid-shopify-payment-gateway.vercel.app" 