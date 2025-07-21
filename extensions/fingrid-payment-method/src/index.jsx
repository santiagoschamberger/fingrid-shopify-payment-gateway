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
  const [savedBanks, setSavedBanks] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [showBankSelection, setShowBankSelection] = useState(false);

  // Calculate total amount
  const totalAmount = cartLines.reduce((total, line) => {
    return total + (line.merchandise.price.amount * line.quantity);
  }, 0);

  // Calculate discount amount
  const discountPercentage = settings.discount_percentage || 0;
  const discountAmount = totalAmount * (discountPercentage / 100);
  const finalAmount = totalAmount - discountAmount;

  // Load saved bank accounts when payment method is selected
  useEffect(() => {
    if (isSelected && customer?.id && settings.show_saved_banks) {
      loadSavedBanks();
    }
  }, [isSelected, customer?.id]);

  const loadSavedBanks = async () => {
    try {
      const response = await fetch(`/api/fingrid/saved-banks?customer_id=${customer.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSavedBanks(data.banks || []);
      }
    } catch (error) {
      console.error('Failed to load saved banks:', error);
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
  }, [isSelected, selectedBankId]);

  const processPayment = async () => {
    if (!selectedBankId && savedBanks.length > 0) {
      throw new Error('Please select a bank account');
    }

    const paymentData = {
      amount: finalAmount,
      currency: 'USD',
      customer_id: customer?.id,
      bank_token: selectedBankId,
      line_items: cartLines.map(line => ({
        id: line.id,
        title: line.merchandise.title,
        quantity: line.quantity,
        price: line.merchandise.price.amount,
      })),
    };

    const response = await fetch('/api/fingrid/process-payment', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Payment processing failed');
    }

    const result = await response.json();
    return result;
  };

  const startBankLinking = async () => {
    try {
      setIsProcessing(true);
      
      const linkData = {
        customer_id: customer?.id,
        customer_email: customer?.email,
        return_url: window.location.origin + '/checkout',
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
        throw new Error('Failed to start bank linking');
      }

      const { link_token, expiry } = await response.json();
      
      // Open Fingrid's bank linking interface
      window.open(`https://link.fingrid.com/link?token=${link_token}`, '_blank');
      
    } catch (error) {
      setErrorMessage(error.message || 'Failed to start bank linking');
      setPaymentStatus('error');
    } finally {
      setIsProcessing(false);
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
            Pay securely with your bank account. No fees, instant verification.
          </Text>

          {discountPercentage > 0 && (
            <Banner status="success">
              <Text size="small">
                💰 Save ${discountAmount.toFixed(2)} ({discountPercentage}% discount) with bank transfer!
              </Text>
            </Banner>
          )}

          {/* Bank Selection UI */}
          {savedBanks.length > 0 && (
            <BlockStack spacing="tight">
              <Text size="small" emphasis="bold">Select Bank Account:</Text>
              {savedBanks.map((bank) => (
                <InlineStack key={bank.token} spacing="tight" blockAlignment="center">
                  <Checkbox
                    checked={selectedBankId === bank.token}
                    onChange={() => setSelectedBankId(bank.token)}
                  />
                  <Text size="small">
                    {bank.bankName} •••• {bank.last4}
                  </Text>
                </InlineStack>
              ))}
            </BlockStack>
          )}

          {/* Add New Bank Button */}
          {customer?.id && (
            <Button
              kind="secondary"
              onPress={startBankLinking}
              disabled={isProcessing}
            >
              {savedBanks.length > 0 ? 'Add New Bank Account' : 'Connect Bank Account'}
            </Button>
          )}

          {/* Payment Status Messages */}
          {paymentStatus === 'processing' && (
            <BlockStack spacing="tight">
              <SkeletonText inlineSize="large" />
              <Text size="small" appearance="subdued">
                🏦 Processing your bank transfer payment...
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
                ✅ Bank transfer payment processed successfully!
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
        </BlockStack>
      )}
    </BlockStack>
  );
}