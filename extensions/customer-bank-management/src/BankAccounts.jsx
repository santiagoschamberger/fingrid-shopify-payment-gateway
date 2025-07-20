import {
  reactExtension,
  useApi,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Card,
  SkeletonText,
  Banner,
} from '@shopify/ui-extensions-react/customer-account';
import { useState, useEffect } from 'react';

export default reactExtension('customer-account.order-status.customer-information.render-after', () => (
  <BankAccountManagement />
));

function BankAccountManagement() {
  const { extension } = useApi();
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSavedBanks();
  }, []);

  const fetchSavedBanks = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, this would call your API endpoint
      // to fetch saved bank accounts for the customer
      const response = await fetch('/api/customer/banks', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await extension.sessionToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bank accounts');
      }

      const data = await response.json();
      setBanks(data.banks || []);
    } catch (err) {
      console.error('Failed to fetch banks:', err);
      setError('Failed to load bank accounts');
      
      // For demo purposes, show some mock data
      setBanks([
        {
          id: '1',
          bankName: 'Chase Bank',
          last4: '1234',
          dateAdded: '2024-01-15'
        },
        {
          id: '2',
          bankName: 'Bank of America',
          last4: '5678',
          dateAdded: '2024-02-20'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const removeBank = async (bankId) => {
    try {
      const response = await fetch(`/api/customer/banks/${bankId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await extension.sessionToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setBanks(banks.filter(bank => bank.id !== bankId));
      } else {
        throw new Error('Failed to remove bank account');
      }
    } catch (err) {
      console.error('Failed to remove bank:', err);
      setError('Failed to remove bank account');
    }
  };

  const addNewBank = async () => {
    try {
      // In a real implementation, this would:
      // 1. Generate a link token
      // 2. Open Fingrid's bank linking modal
      // 3. Handle the new bank account addition
      
      alert('Bank linking feature would open here');
    } catch (err) {
      console.error('Failed to add bank:', err);
      setError('Failed to add new bank account');
    }
  };

  if (loading) {
    return (
      <Card>
        <BlockStack spacing="base">
          <Text size="large" emphasis="strong">
            Saved Bank Accounts
          </Text>
          <SkeletonText />
          <SkeletonText />
        </BlockStack>
      </Card>
    );
  }

  return (
    <Card>
      <BlockStack spacing="base">
        <InlineStack spacing="base" blockAlignment="center">
          <Text size="large" emphasis="strong">
            Saved Bank Accounts
          </Text>
          <Button kind="secondary" size="small" onPress={addNewBank}>
            Add Bank Account
          </Button>
        </InlineStack>

        {error && (
          <Banner status="critical">
            <Text size="small">{error}</Text>
          </Banner>
        )}

        {banks.length === 0 ? (
          <BlockStack spacing="tight">
            <Text appearance="subdued">
              No bank accounts saved.
            </Text>
            <Text size="small" appearance="subdued">
              Add a bank account during checkout to save it for future purchases.
            </Text>
          </BlockStack>
        ) : (
          <BlockStack spacing="base">
            {banks.map(bank => (
              <Card key={bank.id}>
                <InlineStack spacing="base" blockAlignment="center">
                  <BlockStack spacing="none">
                    <Text emphasis="strong">
                      {bank.bankName}
                    </Text>
                    <Text size="small" appearance="subdued">
                      •••• {bank.last4}
                    </Text>
                    <Text size="small" appearance="subdued">
                      Added {new Date(bank.dateAdded).toLocaleDateString()}
                    </Text>
                  </BlockStack>
                  <Button
                    kind="secondary"
                    size="small"
                    tone="critical"
                    onPress={() => removeBank(bank.id)}
                  >
                    Remove
                  </Button>
                </InlineStack>
              </Card>
            ))}
          </BlockStack>
        )}

        <Text size="small" appearance="subdued">
          Your bank account information is securely stored and encrypted. 
          You can use saved accounts for faster checkout on future purchases.
        </Text>
      </BlockStack>
    </Card>
  );
}