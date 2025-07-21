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
      // Load Fingrid's JavaScript SDK dynamically
      const script = document.createElement('script');
      script.src = settings.testMode 
        ? 'https://js.test.fingrid.com/cabbage.js'
        : 'https://js.fingrid.com/cabbage.js';
      script.onload = () => setFingridLoaded(true);
      script.onerror = () => {
        setErrorMessage('Failed to load payment interface');
        setPaymentStatus('error');
      };
      document.head.appendChild(script);
    } catch (error) {
      console.error('Failed to load Fingrid SDK:', error);
      setErrorMessage('Payment service unavailable');
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
        setErrorMessage(error.message || 'Payment processing failed');
        
        return {
          ...result,
          behavior: 'block',
          reason: 'Payment processing failed. Please try again.',
        };
      } finally {
        setIsProcessing(false);
      }
    });
  }, [isSelected, fingridLoaded]);

  const processPayment = async () => {
    return new Promise((resolve, reject) => {
      try {
        // Generate link token first
        generateLinkTokenForPayment()
          .then((token) => {
            if (!window.Fingrid) {
              throw new Error('Fingrid SDK not loaded');
            }

            // Initialize Fingrid with the link token
            window.Fingrid.create({
              link_token: token,
              onSuccess: (public_token, metadata) => {
                // Exchange public token for bank account access
                exchangePublicToken(public_token, metadata)
                  .then(() => {
                    setPaymentStatus('success');
                    resolve();
                  })
                  .catch(reject);
              },
              onLoad: () => {
                console.log('Fingrid interface loaded');
              },
              onExit: (err, metadata) => {
                if (err) {
                  console.error('Fingrid flow exited with error:', err);
                  reject(new Error(err.display_message || 'Payment cancelled'));
                } else {
                  reject(new Error('Payment cancelled by user'));
                }
              },
            }).open();
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
      throw new Error('Failed to generate payment token');
    }

    const { link_token } = await response.json();
    return link_token;
  };

  const exchangePublicToken = async (public_token, metadata) => {
    const exchangeData = {
      public_token,
      account_id: metadata.account_id,
      customer_id: customer?.id,
      amount: finalAmount,
      currency: 'USD',
      line_items: cartLines.map(line => ({
        id: line.id,
        title: line.merchandise.title,
        quantity: line.quantity,
        price: line.merchandise.price.amount,
      })),
    };

    const response = await fetch('/api/fingrid/exchange-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(exchangeData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Payment processing failed');
    }

    return response.json();
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
            🏦 Secure bank transfer powered by Fingrid. Select your bank and pay directly from your account.
          </Text>

          {discountPercentage > 0 && (
            <Banner status="success">
              <Text size="small">
                💰 Save ${discountAmount.toFixed(2)} ({discountPercentage}% discount) with bank transfer!
              </Text>
            </Banner>
          )}

          {!fingridLoaded && (
            <BlockStack spacing="tight">
              <SkeletonText inlineSize="large" />
              <Text size="small" appearance="subdued">
                Loading secure payment interface...
              </Text>
            </BlockStack>
          )}

          {fingridLoaded && paymentStatus === 'idle' && (
            <Text size="small" appearance="accent" emphasis="bold">
              ✓ Payment interface ready. Click "Complete order" to select your bank.
            </Text>
          )}

          {paymentStatus === 'processing' && (
            <BlockStack spacing="tight">
              <SkeletonText inlineSize="large" />
              <Text size="small" appearance="subdued">
                🏦 Opening Fingrid bank selection...
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
                ✅ Payment processed successfully! Your bank transfer is complete.
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
            When you complete your order, Fingrid's secure popup will open for bank selection and payment authorization.
          </Text>
        </BlockStack>
      )}
    </BlockStack>
  );
}