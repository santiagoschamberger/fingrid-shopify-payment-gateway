import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Generate the JavaScript that will be injected into thank you pages
  const script = `
(function() {
  console.log('🔍 Fingrid Thank You Script Loaded!');
  
  // Check if we're on a thank you page
  const isThankYouPage = window.location.pathname.includes('/thank_you') || 
                        window.location.pathname.includes('/orders/') ||
                        document.querySelector('.os-step__title')?.textContent?.includes('Thank you');
  
  if (!isThankYouPage) {
    console.log('🔍 Not on thank you page, script will not run');
    return;
  }
  
  console.log('🔍 On thank you page, initializing Fingrid payment option');
  
  // Extract order information from the page
  function getOrderInfo() {
    const orderNumber = document.querySelector('.os-order-number')?.textContent?.replace('#', '') || 
                       window.location.pathname.split('/').pop();
    const orderTotal = document.querySelector('.payment-due-label')?.textContent || 
                      document.querySelector('.total-line__price')?.textContent;
    
    console.log('🔍 Order info:', { orderNumber, orderTotal });
    
    return { orderNumber, orderTotal };
  }
  
  // Create the Fingrid payment banner
  function createFingridBanner() {
    const orderInfo = getOrderInfo();
    
    const banner = document.createElement('div');
    banner.id = 'fingrid-payment-banner';
    banner.style.cssText = \`
      background: #e3f2fd;
      border: 2px solid #2196f3;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    \`;
    
    banner.innerHTML = \`
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <span style="font-size: 24px;">🏦</span>
        <h3 style="margin: 0; color: #1976d2;">Complete Your Bank Transfer Payment</h3>
      </div>
      <p style="margin: 8px 0; color: #424242;">
        Your order has been placed! Complete your secure bank transfer payment to finalize your purchase.
      </p>
      <div style="background: white; padding: 12px; border-radius: 4px; margin: 12px 0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span>📦 Order:</span>
          <strong>#\${orderInfo.orderNumber || 'N/A'}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>💰 Total:</span>
          <strong>\${orderInfo.orderTotal || 'N/A'}</strong>
        </div>
      </div>
      <button 
        id="fingrid-pay-button" 
        style="
          background: #2196f3;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          margin: 12px 0;
        "
        onmouseover="this.style.background='#1976d2'"
        onmouseout="this.style.background='#2196f3'"
      >
        🏦 Pay with Bank Transfer
      </button>
      <p style="font-size: 12px; color: #666; margin: 8px 0 0 0;">
        🔍 DEBUG: Extension is working • Secure payment processing powered by FinGrid
      </p>
    \`;
    
    // Add click handler for the payment button
    const payButton = banner.querySelector('#fingrid-pay-button');
    payButton.addEventListener('click', function() {
      console.log('🔍 Fingrid payment button clicked');
      
      // Show loading state
      payButton.textContent = '⏳ Generating payment link...';
      payButton.disabled = true;
      
      // Make API call to generate payment link
      fetch('/api/fingrid/generate-link-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_number: orderInfo.orderNumber,
          order_total: orderInfo.orderTotal,
          source: 'thank_you_page'
        })
      })
      .then(response => response.json())
      .then(data => {
        console.log('🔍 Payment link response:', data);
        
        if (data.success && data.link_token) {
          // Open Fingrid payment flow
          const fingridUrl = \`https://connect.fingrid.com?token=\${data.link_token}\`;
          window.open(fingridUrl, 'fingrid-payment', 'width=600,height=800');
          
          // Update button state
          payButton.textContent = '✅ Payment Link Generated!';
          payButton.style.background = '#4caf50';
          
          // Update banner
          banner.style.background = '#e8f5e8';
          banner.style.borderColor = '#4caf50';
        } else {
          console.error('🔍 Failed to generate payment link:', data.error);
          payButton.textContent = '❌ Error - Try Again';
          payButton.style.background = '#f44336';
          payButton.disabled = false;
        }
      })
      .catch(error => {
        console.error('🔍 Network error:', error);
        payButton.textContent = '❌ Network Error - Try Again';
        payButton.style.background = '#f44336';
        payButton.disabled = false;
      });
    });
    
    return banner;
  }
  
  // Insert the banner into the page
  function insertBanner() {
    const banner = createFingridBanner();
    
    // Try different insertion points
    const insertionPoints = [
      '.os-step__description',
      '.step__footer',
      '.main__content',
      '.order-details',
      'main'
    ];
    
    for (const selector of insertionPoints) {
      const target = document.querySelector(selector);
      if (target) {
        console.log('🔍 Inserting banner after:', selector);
        target.parentNode.insertBefore(banner, target.nextSibling);
        return true;
      }
    }
    
    // Fallback: append to body
    console.log('🔍 Fallback: appending banner to body');
    document.body.appendChild(banner);
    return true;
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', insertBanner);
  } else {
    // DOM is already ready
    insertBanner();
  }
  
  console.log('🔍 Fingrid thank you script initialization complete');
})();
`;

  return new Response(script, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
}; 