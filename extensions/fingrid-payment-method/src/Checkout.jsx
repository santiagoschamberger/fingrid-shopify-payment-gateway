import {
  reactExtension,
  useSettings,
  useBuyerJourney,
  useCartLines,
  useApplyCartLinesChange,
  useApi,
  useExtensionCapability,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Checkbox,
  Banner,
  SkeletonText,
} from '@shopify/ui-extensions-react/checkout';
import { useState, useEffect } from 'react';

export default reactExtension('purchase.checkout.payment-method-list.render-after', () => (
  <FingridPaymentMethod />
));

function FingridPaymentMethod() {
  const settings = useSettings();
  const { intercept } = useBuyerJourney();
  const cartLines = useCartLines();
  const applyCartLinesChange = useApplyCartLinesChange();
  const { extension } = useApi();
  
  const [isSelected, setIsSelected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, processing, success, error
  const [errorMessage, setErrorMessage] = useState('');

  // Calculate total amount
  const totalAmount = cartLines.reduce((total, line) => {
    return total + (line.merchandise.price.amount * line.quantity);
  }, 0);

  // Calculate discount amount
  const discountPercentage = settings.discount_percentage || 0;
  const discountAmount = totalAmount * (discountPercentage / 100);
  const finalAmount = totalAmount - discountAmount;

  // Apply discount when Fingrid payment is selected
  useEffect(() => {
    if (isSelected && discountPercentage > 0) {
      applyCartLinesChange({
        type: 'updateCartLine',
        id: cartLines[0]?.id,
        quantity: cartLines[0]?.quantity,
        attributes: [
          {
            key: 'fingrid_discount',
            value: discountAmount.toFixed(2)
          }
        ]
      });
    }
  }, [isSelected, discountAmount]);

  // Intercept checkout submission when Fingrid payment is selected
  useEffect(() => {
    return intercept('purchase.checkout.payment-method.submit', async (result) => {
      if (!isSelected) {
        return result;
      }

      setIsProcessing(true);
      setPaymentStatus('processing');
      
      try {
        // In a real implementation, this would:
        // 1. Generate a link token
        // 2. Open Fingrid's payment modal
        // 3. Handle the bank account linking/selection
        // 4. Process the payment
        
        // For now, simulate the payment process
        await simulatePaymentProcess();
        
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
  }, [isSelected]);

  const simulatePaymentProcess = async () => {
    // Simulate API calls
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.1) {
      throw new Error('Simulated payment failure');
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
            Connect your bank account securely to pay directly from your checking account.
            No fees, instant verification, and enhanced security.
          </Text>

          {discountPercentage > 0 && (
            <Banner status="success">
              <Text size="small">
                You'll save ${discountAmount.toFixed(2)} ({discountPercentage}% discount) 
                by paying with bank transfer!
              </Text>
            </Banner>
          )}

          {paymentStatus === 'processing' && (
            <BlockStack spacing="tight">
              <SkeletonText inlineSize="large" />
              <Text size="small" appearance="subdued">
                Processing your payment...
              </Text>
            </BlockStack>
          )}

          {paymentStatus === 'error' && (
            <Banner status="critical">
              <Text size="small">
                {errorMessage}
              </Text>
            </Banner>
          )}

          {paymentStatus === 'success' && (
            <Banner status="success">
              <Text size="small">
                Payment processed successfully!
              </Text>
            </Banner>
          )}

          <Text size="small" appearance="subdued">
            Final amount: ${finalAmount.toFixed(2)}
          </Text>
        </BlockStack>
      )}
    </BlockStack>
  );
}