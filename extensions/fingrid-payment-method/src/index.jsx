import {
  reactExtension,
  useSettings,
  useBuyerJourney,
  useCartLines,
  useApi,
  useCustomer,
  useTotalAmount,
  useSelectedPaymentOptions,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Banner,
  SkeletonText,
  Spinner,
} from '@shopify/ui-extensions-react/checkout';
import { useState, useEffect } from 'react';

// Shopify Plus checkout extension - enhances manual Bank Transfer payment
export default reactExtension('purchase.checkout.payment-method-list.render-after', () => (
  <FingridPaymentEnhancement />
));

function FingridPaymentEnhancement() {
  const settings = useSettings();
  const { intercept } = useBuyerJourney();
  const cartLines = useCartLines();
  const { sessionToken } = useApi();
  const customer = useCustomer();
  const totalAmount = useTotalAmount();
  const selectedPaymentOptions = useSelectedPaymentOptions();

  const [isEnhancedMode, setIsEnhancedMode] = useState(false);
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentProcessed, setPaymentProcessed] = useState(false);

  // Detect if Bank Transfer/Manual payment is selected
  const isBankTransferSelected = selectedPaymentOptions.some(option => 
    option.type === 'manualPayment' || 
    option.type === 'offsite' ||
    option.handle?.toLowerCase().includes('bank') ||
    option.handle?.toLowerCase().includes('transfer') ||
    option.handle?.toLowerCase().includes('manual') ||
    option.name?.toLowerCase().includes('bank') ||
    option.name?.toLowerCase().includes('transfer')
  );

  // Show enhancement banner to encourage Bank Transfer selection
  const showEnhancement = () => {
    return (
      <Banner status="info">
        <BlockStack spacing="tight">
          <Text emphasis="strong">🏦 Enhanced Bank Transfer Available</Text>
          <Text size="small">
            Select "Bank Transfer" above for instant bank account payments with FinGrid
          </Text>
          <InlineStack spacing="tight">
            <Text size="small">✓ Instant processing</Text>
            <Text size="small">✓ Bank-level security</Text>
            <Text size="small">✓ No additional fees</Text>
          </InlineStack>
          
          <Button
            kind="secondary"
            size="small"
            onPress={() => setIsEnhancedMode(true)}
          >
            Activate Enhanced Bank Transfer
          </Button>
        </BlockStack>
      </Banner>
    );
  };

  // Enhanced payment interface
  const showPaymentInterface = () => {
    const generateLinkToken = async () => {
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
            customer_name: customer?.firstName + ' ' + customer?.lastName || 'Customer',
            customer_email: customer?.email,
            amount: Math.round(totalAmount.amount * 100), // Convert to cents
            currency: totalAmount.currencyCode || 'USD',
            cart_items: cartLines.map(line => ({
              name: line.merchandise?.product?.title || 'Product',
              quantity: line.quantity,
              amount: Math.round(line.cost?.totalAmount?.amount * 100) || 0
            }))
          })
        });

        const data = await response.json();
        if (data.success && data.link_token) {
          setLinkToken(data.link_token);
          // Open FinGrid payment flow
          openFinGridPayment(data.link_token);
        } else {
          setError(data.error || 'Failed to generate payment link');
        }
      } catch (err) {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    const openFinGridPayment = (token) => {
      // Open FinGrid payment interface
      const fingridUrl = `https://connect.fingrid.com?token=${token}`;
      window.open(fingridUrl, 'fingrid-payment', 'width=600,height=800');
      
      // Listen for payment completion
      const handlePaymentComplete = (event) => {
        if (event.data.type === 'FINGRID_PAYMENT_SUCCESS') {
          setPaymentProcessed(true);
          setError(null);
          window.removeEventListener('message', handlePaymentComplete);
        }
      };
      
      window.addEventListener('message', handlePaymentComplete);
    };

    return (
      <Banner status={paymentProcessed ? "success" : "warning"}>
        <BlockStack spacing="base">
          <Text emphasis="strong">
            {paymentProcessed ? '✅ Payment Ready!' : '🏦 Complete Your Bank Transfer'}
          </Text>
          
          {paymentProcessed ? (
            <Text size="small">
              Your bank transfer has been set up successfully. You can now complete your order.
            </Text>
          ) : (
            <>
              <Text size="small">
                Complete your secure bank transfer payment to finalize this order.
              </Text>
              
              <BlockStack spacing="tight">
                <InlineStack spacing="tight">
                  <Text size="small">💰 Amount:</Text>
                  <Text size="small" emphasis="strong">
                    {totalAmount.currencyCode} {totalAmount.amount}
                  </Text>
                </InlineStack>
                
                <InlineStack spacing="tight">
                  <Text size="small">🛍️ Items:</Text>
                  <Text size="small" emphasis="strong">
                    {cartLines.reduce((total, line) => total + line.quantity, 0)} item(s)
                  </Text>
                </InlineStack>
              </BlockStack>

              {error && (
                <Banner status="critical">
                  <Text size="small">{error}</Text>
                </Banner>
              )}

              <Button
                kind="primary"
                loading={loading}
                onPress={generateLinkToken}
                disabled={loading || paymentProcessed}
              >
                {loading ? (
                  <InlineStack spacing="tight">
                    <Spinner size="small" />
                    <Text>Processing...</Text>
                  </InlineStack>
                ) : (
                  '🏦 Pay with Bank Transfer'
                )}
              </Button>

              <Text appearance="subdued" size="small">
                Secure payment processing powered by FinGrid
              </Text>
            </>
          )}
        </BlockStack>
      </Banner>
    );
  };

  // Only show enhancement when Bank Transfer is selected
  if (!isBankTransferSelected) {
    return null; // Hide when other payment methods are selected
  }

  // Return the appropriate interface
  if (isEnhancedMode) {
    return showPaymentInterface();
  }

  return showEnhancement();
}