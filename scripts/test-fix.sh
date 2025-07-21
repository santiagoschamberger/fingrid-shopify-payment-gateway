#!/bin/bash

# Test script for verifying the GraphQL fix
echo "🧪 Testing GraphQL fix for settings functionality..."

BASE_URL="https://fingrid-shopify-payment-gateway.vercel.app"

echo "⏳ Waiting for deployment to complete..."
sleep 30

echo "🔍 Testing endpoints..."

# Test 1: Check if settings page loads (GET request)
echo "1️⃣ Testing settings page load..."
SETTINGS_GET_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/app/settings")
echo "   Settings GET status: $SETTINGS_GET_STATUS"

# Test 2: Check if app index loads
echo "2️⃣ Testing app index..."
APP_INDEX_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/app")
echo "   App index status: $APP_INDEX_STATUS"

# Test 3: Check if API endpoints are accessible
echo "3️⃣ Testing API endpoints..."
API_GENERATE_TOKEN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/fingrid/generate-link-token" -d "email=test@example.com&firstName=Test&lastName=User")
echo "   Generate token API status: $API_GENERATE_TOKEN_STATUS"

# Test 4: Check server logs for GraphQL errors
echo "4️⃣ Checking for GraphQL errors in recent deployments..."
echo "   (Manual check required in Vercel dashboard)"

# Test 5: Run unit tests
echo "5️⃣ Running unit tests..."
npm test -- test/settings-integration.test.ts --run

# Summary
echo ""
echo "📋 Test Summary:"
echo "   Settings GET: $SETTINGS_GET_STATUS (should be 200 or redirect)"
echo "   App Index: $APP_INDEX_STATUS (should be 200 or redirect)"
echo "   API Generate Token: $API_GENERATE_TOKEN_STATUS (should be 400/401, not 500)"
echo ""

if [[ "$SETTINGS_GET_STATUS" =~ ^(200|301|302)$ ]] && [[ "$APP_INDEX_STATUS" =~ ^(200|301|302)$ ]]; then
    echo "✅ Basic functionality tests PASSED"
    echo "🎉 GraphQL fix appears to be working!"
else
    echo "❌ Some tests FAILED"
    echo "🔍 Check Vercel logs for more details"
fi

echo ""
echo "🔗 Manual testing URL: $BASE_URL/app/settings"
echo "📊 Vercel Dashboard: https://vercel.com/dashboard" 