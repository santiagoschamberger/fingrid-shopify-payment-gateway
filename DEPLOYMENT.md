# Deployment Guide - Fingrid Payment Gateway

This guide walks you through deploying the Fingrid Payment Gateway Shopify app to production.

## Deployment Options

### Option 1: Vercel (Recommended - $0/month)

Vercel provides excellent hosting for Remix apps with automatic deployments and edge functions.

#### Step 1: Prepare Your Repository

1. Push your code to GitHub, GitLab, or Bitbucket
2. Ensure your `.env.example` is up to date
3. Test your app locally with `npm run dev`

#### Step 2: Deploy to Vercel

1. **Create Vercel Account**: Sign up at [vercel.com](https://vercel.com)

2. **Connect Repository**: 
   - Click "New Project"
   - Import your Git repository

3. **Configure Build Settings**:
   - Framework Preset: `Remix`
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `build` (auto-detected)
   - Install Command: `npm install` (auto-detected)

4. **Set Environment Variables** in Vercel Dashboard:
   ```
   SHOPIFY_API_KEY=your_shopify_app_key
   SHOPIFY_API_SECRET=your_shopify_app_secret
   SHOPIFY_APP_URL=https://your-app-name.vercel.app
   SCOPES=read_orders,write_orders,read_customers,write_customers,read_checkouts,write_checkouts,read_payment_gateways,write_payment_gateways,read_products,write_script_tags
   SESSION_SECRET=your_32_character_minimum_session_secret
   ENCRYPTION_KEY=your_32_character_encryption_key_here
   NODE_ENV=production
   ```

#### Step 3: Update Shopify Configuration

1. Update your `shopify.app.toml`:
   ```toml
   application_url = "https://your-app-name.vercel.app"
   ```

2. Update redirect URLs:
   ```toml
   redirect_urls = [ "https://your-app-name.vercel.app/api/auth" ]
   ```

3. Deploy to Shopify:
   ```bash
   npm run deploy
   ```

### Option 2: Netlify

1. **Create Netlify Account**: Sign up at [netlify.com](https://netlify.com)
2. **Connect Repository** and set build command to `npm run build`
3. **Set Environment Variables** in Netlify dashboard

### Option 3: Railway

1. **Connect Repository** at [railway.app](https://railway.app)
2. **Set Environment Variables** in Railway dashboard
3. **Deploy** automatically on git push

## Post-Deployment Setup

### 1. Configure Fingrid Settings

After deployment, access your app and configure:

1. **Navigate to Settings**: Go to your Shopify admin → Apps → Fingrid Payment Gateway → Settings

2. **Test Mode Configuration**:
   - Test Gateway URL: `https://api.test.fingrid.com`
   - Test Client ID: `AUrByDqHwcgK29YV7BkhrnzB2Jy8Vg`
   - Test Client Secret: `ViWpgUNQEJdCuRBXnXMe9V0MNzUcxb`
   - Test Connected Account: (provided by Fingrid)

3. **Production Configuration**:
   - Live Gateway URL: `https://api.fingrid.com`
   - Live Client ID: (provided by Fingrid)
   - Live Client Secret: (provided by Fingrid)
   - Live Connected Account: (provided by Fingrid)

4. **Payment Settings**:
   - Client Name: Your store name
   - Discount Percentage: 0-20% (optional discount for bank payments)
   - Theme Color: Your brand color (hex format)

### 2. Test Payment Flow

1. **Enable Test Mode** in settings
2. **Create a test order** in your development store
3. **Select Fingrid payment method** at checkout
4. **Complete the bank linking flow**
5. **Verify transaction processing**

### 3. Enable Extensions

The app includes two extensions that need to be activated:

1. **Checkout UI Extension**: 
   - Shows Fingrid payment method in checkout
   - Handles bank account linking and payment processing

2. **Customer Account Extension**:
   - Allows customers to manage saved bank accounts
   - Shows payment history

Extensions are automatically deployed with the app.

## Production Checklist

- [ ] All environment variables set correctly
- [ ] Shopify app configuration updated with production URL
- [ ] Fingrid credentials configured (test and production)
- [ ] Payment flow tested in test mode
- [ ] Extensions activated and tested
- [ ] Error logging and monitoring configured
- [ ] SSL certificate active (automatic with Netlify/Heroku)
- [ ] Webhook endpoints accessible and secure

## Monitoring and Maintenance

### Error Tracking

Monitor your app's performance:
- Check Netlify/Heroku logs for errors
- Monitor webhook delivery in Shopify admin
- Track payment success rates in your admin dashboard

### Security Updates

- Regularly update dependencies: `npm audit && npm update`
- Rotate encryption keys periodically
- Monitor for security advisories

### Performance Optimization

- Monitor API response times
- Optimize metafields queries if needed
- Consider implementing caching for frequently accessed data

## Troubleshooting

### Common Issues

1. **Webhook Delivery Failures**:
   - Check webhook URLs are accessible
   - Verify HMAC validation

2. **Payment Processing Errors**:
   - Validate Fingrid API credentials
   - Check network connectivity
   - Review API rate limits

3. **Extension Not Loading**:
   - Verify extension files are deployed
   - Check browser console for JavaScript errors
   - Ensure proper extension configuration

### Support

For deployment issues:
1. Check the logs in your hosting platform
2. Verify all environment variables are set
3. Test API endpoints manually
4. Contact Fingrid support for API-related issues

## Cost Estimation

### Recommended Setup (Vercel)
- **Hosting**: $0/month (hobby plan)
- **Database**: $0/month (using Shopify metafields)
- **SSL**: $0/month (included)
- **Edge Functions**: $0/month (included)
- **Total**: $0/month

### Alternative Setups
- **Netlify**: $0/month (free tier)
- **Railway**: $5/month (starter plan)
- **Heroku**: $7/month (basic dyno)

The metafields approach saves $25-100/month compared to traditional database hosting!