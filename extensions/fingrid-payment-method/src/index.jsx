import {
  reactExtension,
  useSettings,
  useBuyerJourney,
  useCartLines,
  useApi,
  usePurchasingCompany,
  useCustomer,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Checkbox,
  Banner,
  SkeletonText,
  Image,
} from '@shopify/ui-extensions-react/checkout';
import { useState, useEffect } from 'react';

export default reactExtension('purchase.checkout.payment-method-list.render-after', () => (
  <FingridPaymentMethod />
));

function FingridPaymentMethod() {
  const settings = useSettings();
  const { intercept } = useBuyerJourney();
  const cartLines = useCartLines();
  const { extension, query, sessionToken } = useApi();
  const customer = useCustomer();
  
  const [isSelected, setIsSelected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, processing, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [linkToken, setLinkToken] = useState(null);
  const [fingridLoaded, setFingridLoaded] = useState(false);

  // Calculate total amount
  const totalAmount = cartLines.reduce((total, line) => {
    return total + (line.merchandise.price.amount * line.quantity);
  }, 0);

  // Calculate discount amount
  const discountPercentage = settings.discount_percentage || 0;
  const discountAmount = totalAmount * (discountPercentage / 100);
  const finalAmount = totalAmount - discountAmount;

  // Load Fingrid SDK when payment method is selected
  useEffect(() => {
    if (isSelected && !fingridLoaded) {
      loadFingridSDK();
    }
  }, [isSelected]);

  const loadFingridSDK = async () => {
    try {
      // Use correct Fingrid JavaScript SDK URLs from documentation
      const script = document.createElement('script');
      script.src = settings.testMode 
        ? 'https://cabbagepay.com/js/sandbox/cabbage.js'
        : 'https://cabbagepay.com/js/production/cabbage.js';
      
      script.onload = () => {
        setFingridLoaded(true);
        // Set up message listener for Fingrid responses
        window.addEventListener('message', handleFingridMessage);
      };
      
      script.onerror = () => {
        setErrorMessage('Failed to load payment interface. Please try again.');
        setPaymentStatus('error');
      };
      
      document.head.appendChild(script);
    } catch (error) {
      console.error('Failed to load Fingrid SDK:', error);
      setErrorMessage('Payment service temporarily unavailable');
      setPaymentStatus('error');
    }
  };

  // Intercept checkout submission when Fingrid payment is selected
  useEffect(() => {
    return intercept('purchase.checkout.payment-method.submit', async (result) => {
      if (!isSelected) {
        return result;
      }

      setIsProcessing(true);
      setPaymentStatus('processing');
      
      try {
        await processPayment();
        setPaymentStatus('success');
        return result;
      } catch (error) {
        setPaymentStatus('error');
        setErrorMessage(error.message || 'Payment processing failed. Please try again.');
        
        return {
          ...result,
          behavior: 'block',
          reason: 'Payment processing failed. Please try again or choose a different payment method.',
        };
      } finally {
        setIsProcessing(false);
      }
    });
  }, [isSelected, fingridLoaded]);

  const handleFingridMessage = (event) => {
    try {
      // Handle both string and object data
      let data;
      if (typeof event.data === 'string') {
        data = JSON.parse(event.data);
      } else {
        data = event.data;
      }
      
      if (data.message === 'success') {
        // User successfully connected bank, now exchange the public token
        exchangePublicToken(data.public_token)
          .then(() => {
            setPaymentStatus('success');
            if (window.cabbage && window.cabbage.closeGrid) {
              window.cabbage.closeGrid();
            }
          })
          .catch((error) => {
            setPaymentStatus('error');
            setErrorMessage(error.message || 'Payment processing failed');
            setIsProcessing(false);
          });
      } else if (data.message === 'terminated') {
        // User cancelled the flow
        setPaymentStatus('error');
        setErrorMessage('Payment cancelled. Please try again or choose a different payment method.');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error parsing Fingrid message:', error);
      setPaymentStatus('error');
      setErrorMessage('Payment interface error. Please try again.');
      setIsProcessing(false);
    }
  };

  const processPayment = async () => {
    return new Promise((resolve, reject) => {
      try {
        // Generate link token first
        generateLinkTokenForPayment()
          .then((token) => {
            if (!window.cabbage) {
              throw new Error('Payment interface not ready. Please refresh and try again.');
            }

            // Store resolve/reject for use in message handler
            window.fingridResolve = resolve;
            window.fingridReject = reject;

            // Initialize and open Fingrid interface according to documentation
            window.cabbage.initializeGrid(token);
            window.cabbage.openGrid(token);
          })
          .catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  };

  const generateLinkTokenForPayment = async () => {
    const linkData = {
      customer_id: customer?.id,
      customer_email: customer?.email,
      customer_phone: customer?.phone,
      customer_first_name: customer?.firstName,
      customer_last_name: customer?.lastName,
      return_url: window.location.href,
      amount: finalAmount,
      currency: 'USD',
    };

    const response = await fetch('/api/fingrid/generate-link-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(linkData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to initialize payment. Please try again.');
    }

    const data = await response.json();
    if (!data.success || !data.link_token) {
      throw new Error(data.error || 'Failed to initialize payment. Please try again.');
    }

    return data.link_token;
  };

  const exchangePublicToken = async (public_token) => {
    try {
      // First exchange public token for bank token
      const exchangeData = {
        public_token,
        customer_id: customer?.id,
      };

      const exchangeResponse = await fetch('/api/fingrid/exchange-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exchangeData),
      });

      if (!exchangeResponse.ok) {
        const error = await exchangeResponse.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to connect bank account. Please try again.');
      }

      const exchangeResult = await exchangeResponse.json();
      if (!exchangeResult.success || !exchangeResult.bank_token) {
        throw new Error(exchangeResult.error || 'Failed to connect bank account. Please try again.');
      }

      // Now create the transaction using the bank token
      const transactionData = {
        bank_token: exchangeResult.bank_token,
        amount: finalAmount,
        currency: 'USD',
        customer_id: customer?.id,
        statement_descriptor: `Shopify Order`,
        metadata: JSON.stringify({
          shopify_checkout: true,
          customer_email: customer?.email,
          line_items: cartLines.map(line => ({
            id: line.id,
            title: line.merchandise.title,
            quantity: line.quantity,
            price: line.merchandise.price.amount,
          })),
        }),
      };

      const transactionResponse = await fetch('/api/fingrid/process-payment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });

      if (!transactionResponse.ok) {
        const error = await transactionResponse.json().catch(() => ({}));
        throw new Error(error.error || 'Payment processing failed. Please try again.');
      }

      const transactionResult = await transactionResponse.json();
      if (!transactionResult.success) {
        throw new Error(transactionResult.error || 'Payment processing failed. Please try again.');
      }

      return transactionResult;
    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    }
  };

  const handleTogglePayment = (checked) => {
    setIsSelected(checked);
    setPaymentStatus('idle');
    setErrorMessage('');
  };

  return (
    <BlockStack spacing="base">
      <Checkbox
        checked={isSelected}
        onChange={handleTogglePayment}
      >
        <InlineStack spacing="tight" blockAlignment="center">
          <Text emphasis="strong">
            Pay by Bank Transfer
          </Text>
          {discountPercentage > 0 && (
            <Text appearance="accent" emphasis="strong">
              Save {discountPercentage}%
            </Text>
          )}
        </InlineStack>
      </Checkbox>

      {isSelected && (
        <BlockStack spacing="base">
          <Text size="small" appearance="subdued">
            🏦 Secure bank transfer powered by FinGrid. Connect your bank account and pay directly.
          </Text>

          {discountPercentage > 0 && (
            <Banner status="success">
              <Text size="small">
                💰 Save ${discountAmount.toFixed(2)} ({discountPercentage}% discount) with bank transfer!
              </Text>
            </Banner>
          )}

          {!fingridLoaded && paymentStatus === 'idle' && (
            <BlockStack spacing="tight">
              <SkeletonText inlineSize="large" />
              <Text size="small" appearance="subdued">
                Loading secure payment interface...
              </Text>
            </BlockStack>
          )}

          {fingridLoaded && paymentStatus === 'idle' && (
            <Banner status="info">
              <Text size="small">
                ✓ Payment interface ready. Click "Complete order" to select your bank and authorize payment.
              </Text>
            </Banner>
          )}

          {paymentStatus === 'processing' && (
            <BlockStack spacing="tight">
              <SkeletonText inlineSize="large" />
              <Text size="small" appearance="subdued">
                🏦 Opening bank selection interface...
              </Text>
            </BlockStack>
          )}

          {paymentStatus === 'error' && (
            <Banner status="critical">
              <Text size="small">
                ❌ {errorMessage}
              </Text>
            </Banner>
          )}

          {paymentStatus === 'success' && (
            <Banner status="success">
              <Text size="small">
                ✅ Payment authorized successfully! Your bank transfer is being processed.
              </Text>
            </Banner>
          )}

          {/* Final Amount Display */}
          <InlineStack spacing="base" blockAlignment="center">
            <Text size="small" appearance="subdued">
              Total amount:
            </Text>
            <Text size="small" emphasis="bold">
              ${finalAmount.toFixed(2)}
            </Text>
            {discountPercentage > 0 && (
              <Text size="small" appearance="subdued">
                (${discountAmount.toFixed(2)} saved)
              </Text>
            )}
          </InlineStack>

          <Text size="small" appearance="subdued">
            When you complete your order, FinGrid's secure popup will open for bank selection and payment authorization. The process is secure and your bank credentials are never shared.
          </Text>
        </BlockStack>
      )}
    </BlockStack>
  );
}