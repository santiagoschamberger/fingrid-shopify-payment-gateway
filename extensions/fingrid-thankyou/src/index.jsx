import {
  reactExtension,
  useSettings,
  useApi,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Banner,
  Spinner,
} from '@shopify/ui-extensions-react/checkout';
import { useState, useEffect } from 'react';

// Thank You page extension - works on all Shopify plans including Grow
export default reactExtension('purchase.thank-you.customer-information.render-after', () => (
  <FingridThankYouPayment />
));

function FingridThankYouPayment() {
  const settings = useSettings();
  const { sessionToken } = useApi();
  
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentLinkGenerated, setPaymentLinkGenerated] = useState(false);

  // Get order ID from URL parameters
  const getOrderId = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('order_id') || window.location.pathname.split('/').pop();
    }
    return null;
  };

  // Fetch order details to check payment method
  useEffect(() => {
    const fetchOrderDetails = async () => {
      const orderId = getOrderId();
      if (!orderId) {
        setError('Order ID not found');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/fingrid/order-details?order_id=${orderId}`, {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        });

        const data = await response.json();
        if (data.success) {
          setOrderData(data.order);
        } else {
          setError(data.error || 'Failed to fetch order details');
        }
      } catch (err) {
        setError('Network error fetching order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [sessionToken]);

  // Check if order uses manual/bank transfer payment
  const isManualPayment = () => {
    if (!orderData?.payment_gateway_names) return false;
    
    return orderData.payment_gateway_names.some(gateway => 
      gateway.toLowerCase().includes('bank') ||
      gateway.toLowerCase().includes('transfer') ||
      gateway.toLowerCase().includes('manual')
    );
  };

  // Generate Fingrid payment link
  const generatePaymentLink = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/fingrid/generate-link-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          order_id: orderData.id,
          customer_name: orderData.customer?.first_name + ' ' + orderData.customer?.last_name,
          customer_email: orderData.customer?.email,
          amount: Math.round(parseFloat(orderData.total_price) * 100),
          currency: orderData.currency,
          order_number: orderData.order_number,
        })
      });

      const data = await response.json();
      if (data.success && data.link_token) {
        // Open Fingrid payment flow
        const fingridUrl = `https://connect.fingrid.com?token=${data.link_token}`;
        window.open(fingridUrl, 'fingrid-payment', 'width=600,height=800');
        setPaymentLinkGenerated(true);
      } else {
        setError(data.error || 'Failed to generate payment link');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <Banner>
        <InlineStack spacing="tight">
          <Spinner size="small" />
          <Text>Loading payment information...</Text>
        </InlineStack>
      </Banner>
    );
  }

  // Show error state
  if (error) {
    return (
      <Banner status="critical">
        <Text size="small">{error}</Text>
      </Banner>
    );
  }

  // Only show for manual payment methods
  if (!isManualPayment()) {
    return null;
  }

  // Show payment completion banner
  return (
    <Banner status={paymentLinkGenerated ? "success" : "info"}>
      <BlockStack spacing="base">
        <Text emphasis="strong">
          {paymentLinkGenerated ? '✅ Payment Link Generated!' : '🏦 Complete Your Bank Transfer Payment'}
        </Text>
        
        {paymentLinkGenerated ? (
          <BlockStack spacing="tight">
            <Text size="small">
              Your secure payment link has been opened. Complete your bank transfer to finalize this order.
            </Text>
            <Text size="small" appearance="subdued">
              Order #{orderData?.order_number} • Total: {orderData?.currency} {orderData?.total_price}
            </Text>
          </BlockStack>
        ) : (
          <BlockStack spacing="tight">
            <Text size="small">
              Your order has been placed! Complete your secure bank transfer payment to finalize your purchase.
            </Text>
            
            <InlineStack spacing="tight">
              <Text size="small">📦 Order:</Text>
              <Text size="small" emphasis="strong">#{orderData?.order_number}</Text>
            </InlineStack>
            
            <InlineStack spacing="tight">
              <Text size="small">💰 Total:</Text>
              <Text size="small" emphasis="strong">
                {orderData?.currency} {orderData?.total_price}
              </Text>
            </InlineStack>

            <Button
              kind="primary"
              loading={loading}
              onPress={generatePaymentLink}
              disabled={loading}
            >
              {loading ? (
                <InlineStack spacing="tight">
                  <Spinner size="small" />
                  <Text>Generating...</Text>
                </InlineStack>
              ) : (
                '🏦 Pay with Bank Transfer'
              )}
            </Button>

            <Text appearance="subdued" size="small">
              Secure payment processing powered by FinGrid
            </Text>
          </BlockStack>
        )}
      </BlockStack>
    </Banner>
  );
}