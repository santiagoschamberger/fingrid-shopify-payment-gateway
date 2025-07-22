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
} from '@shopify/ui-extensions-react/customer-account';
import { useState, useEffect } from 'react';

// Customer Account Order Status extension - works on all Shopify plans
export default reactExtension('customer-account.order-status.customer-information.render-after', () => (
  <FingridOrderStatusPayment />
));

function FingridOrderStatusPayment() {
  const settings = useSettings();
  const { sessionToken } = useApi();
  
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentLinkGenerated, setPaymentLinkGenerated] = useState(false);

  // Debug logging
  console.log('🔍 Fingrid Order Status Extension Loaded!');
  console.log('🔍 Settings:', settings);
  console.log('🔍 SessionToken available:', !!sessionToken);
  console.log('🔍 Window location:', typeof window !== 'undefined' ? window.location.href : 'SSR');

  // Get order ID from URL parameters - customer account URLs are different
  const getOrderId = () => {
    if (typeof window !== 'undefined') {
      // Customer account URLs: /account/orders/{order_id}
      const pathParts = window.location.pathname.split('/');
      const orderIndex = pathParts.findIndex(part => part === 'orders');
      const orderId = orderIndex !== -1 ? pathParts[orderIndex + 1] : null;
      
      console.log('🔍 Order ID from customer account URL:', orderId);
      console.log('🔍 Full path parts:', pathParts);
      
      return orderId;
    }
    return null;
  };

  // Fetch order details to check payment method
  useEffect(() => {
    const fetchOrderDetails = async () => {
      const orderId = getOrderId();
      console.log('🔍 Attempting to fetch order details for:', orderId);
      
      if (!orderId) {
        console.log('🔍 No order ID found, setting error');
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

        console.log('🔍 API Response status:', response.status);
        const data = await response.json();
        console.log('🔍 API Response data:', data);
        
        if (data.success) {
          setOrderData(data.order);
          console.log('🔍 Order data set:', data.order);
        } else {
          setError(data.error || 'Failed to fetch order details');
          console.log('🔍 API Error:', data.error);
        }
      } catch (err) {
        console.error('🔍 Network error:', err);
        setError('Network error fetching order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [sessionToken]);

  // Check if order uses manual/bank transfer payment
  const isManualPayment = () => {
    if (!orderData?.payment_gateway_names) {
      console.log('🔍 No payment gateway names found');
      return false;
    }
    
    const isManual = orderData.payment_gateway_names.some(gateway => 
      gateway.toLowerCase().includes('bank') ||
      gateway.toLowerCase().includes('transfer') ||
      gateway.toLowerCase().includes('manual')
    );
    
    console.log('🔍 Payment gateways:', orderData.payment_gateway_names);
    console.log('🔍 Is manual payment:', isManual);
    
    return isManual;
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

  console.log('🔍 Current state:', { loading, error, orderData: !!orderData, paymentLinkGenerated });

  // Show loading state
  if (loading) {
    return (
      <Banner status="info">
        <InlineStack spacing="tight">
          <Spinner size="small" />
          <Text>🔍 DEBUG: Loading payment information...</Text>
        </InlineStack>
      </Banner>
    );
  }

  // Show error state
  if (error) {
    return (
      <Banner status="critical">
        <Text size="small">🔍 DEBUG ERROR: {error}</Text>
      </Banner>
    );
  }

  // Show banner even if no order data for debugging
  if (!orderData) {
    return (
      <Banner status="info">
        <Text size="small">🔍 DEBUG: No order data available</Text>
      </Banner>
    );
  }

  // Show payment completion banner
  return (
    <Banner status={paymentLinkGenerated ? "success" : "info"}>
      <BlockStack spacing="base">
        <Text emphasis="strong">
          🔍 DEBUG: {paymentLinkGenerated ? '✅ Payment Link Generated!' : '🏦 Complete Your Bank Transfer Payment'}
        </Text>
        
        <Text size="small">
          Order #{orderData?.order_number || 'N/A'} • Total: {orderData?.currency || 'N/A'} {orderData?.total_price || 'N/A'}
        </Text>
        
        <Text size="small">
          Payment Methods: {orderData?.payment_gateway_names?.join(', ') || 'None found'}
        </Text>
        
        {!paymentLinkGenerated && (
          <Button
            kind="primary"
            loading={loading}
            onPress={generatePaymentLink}
            disabled={loading}
          >
            🏦 Pay with Bank Transfer (DEBUG)
          </Button>
        )}
        
        <Text appearance="subdued" size="small">
          🔍 DEBUG: Extension is working • Powered by FinGrid
        </Text>
      </BlockStack>
    </Banner>
  );
}