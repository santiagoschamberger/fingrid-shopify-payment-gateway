import { json, redirect } from '@remix-run/node';
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, useSubmit, Form } from '@remix-run/react';
import { useState } from 'react';
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Checkbox,
  Button,
  Banner,
  Select,
  RangeSlider,
} from '@shopify/polaris';
import { authenticate } from '~/shopify.server';
import { ShopifyStorageService } from '~/services/shopify-storage.server';
import { validateInput, schemas } from '~/utils/validation.server';
import type { AppSettings } from '~/types/fingrid';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    console.log('Settings loader: Starting authentication');
    const { session } = await authenticate.admin(request);
    console.log('Settings loader: Authentication successful');
    
    const storageService = new ShopifyStorageService(session);
    console.log('Settings loader: Created storage service');
    
    const settings = await storageService.getAppSettings();
    console.log('Settings loader: Retrieved settings', { settings });

    return json({ settings });
  } catch (error) {
    console.error('Settings loader error:', error);
    throw new Response('Settings loading failed', { 
      status: 500,
      statusText: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  try {
    const formData = await request.formData();
    const settings = {
      testMode: formData.get('testMode') === 'true',
      clientName: formData.get('clientName') as string,
      discountPercentage: parseFloat(formData.get('discountPercentage') as string) || 0,
      themeColor: formData.get('themeColor') as string,
      themeLogo: formData.get('themeLogo') as string,
      testGatewayUrl: formData.get('testGatewayUrl') as string,
      testClientId: formData.get('testClientId') as string,
      testClientSecret: formData.get('testClientSecret') as string,
      testConnectedAccount: formData.get('testConnectedAccount') as string,
      liveGatewayUrl: formData.get('liveGatewayUrl') as string,
      liveClientId: formData.get('liveClientId') as string,
      liveClientSecret: formData.get('liveClientSecret') as string,
      liveConnectedAccount: formData.get('liveConnectedAccount') as string,
      postTransactionStatus: formData.get('postTransactionStatus') as string || 'pending',
      webhookSuccessStatus: formData.get('webhookSuccessStatus') as string || 'paid',
      webhookFailedStatus: formData.get('webhookFailedStatus') as string || 'cancelled',
    };

    // Validate settings
    const validatedSettings = validateInput(schemas.settingsUpdate, settings);

    // Save settings
    const storageService = new ShopifyStorageService(session);
    await storageService.updateAppSettings(validatedSettings);

    return json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error saving settings:', error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to save settings' 
    }, { status: 400 });
  }
};

export default function Settings() {
  const { settings } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    
    const formDataToSubmit = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formDataToSubmit.append(key, value.toString());
      }
    });
    
    submit(formDataToSubmit, { 
      method: 'POST',
      action: '/app/settings'
    });
    
    setTimeout(() => setIsLoading(false), 1000);
  };

  const statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Authorized', value: 'authorized' },
    { label: 'Partially Paid', value: 'partially_paid' },
    { label: 'Paid', value: 'paid' },
    { label: 'Voided', value: 'voided' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  return (
    <Page 
      title="Fingrid Payment Gateway Settings"
      subtitle="Configure your payment gateway integration"
    >
      <Layout>
        <Layout.Section>
          <Card>
            <Form onSubmit={handleSubmit}>
              <FormLayout>
                <Banner
                  title="Payment Gateway Configuration"
                  status="info"
                >
                  Configure your Fingrid payment gateway settings. Test mode allows you to process payments using sandbox credentials.
                </Banner>

                <Checkbox
                  label="Test Mode"
                  checked={formData.testMode}
                  onChange={(value) => setFormData({ ...formData, testMode: value })}
                  helpText="Enable test mode to use sandbox credentials for testing"
                />

                <TextField
                  label="Client Name"
                  value={formData.clientName || ''}
                  onChange={(value) => setFormData({ ...formData, clientName: value })}
                  helpText="Display name for your payment gateway"
                />

                <RangeSlider
                  label={`Discount Percentage: ${formData.discountPercentage}%`}
                  value={formData.discountPercentage}
                  min={0}
                  max={20}
                  step={0.5}
                  onChange={(value) => setFormData({ ...formData, discountPercentage: value })}
                  suffix="%"
                  helpText="Discount to offer customers who pay by bank transfer"
                />

                <TextField
                  label="Theme Color"
                  value={formData.themeColor || ''}
                  onChange={(value) => setFormData({ ...formData, themeColor: value })}
                  placeholder="#1a73e8"
                  helpText="Hex color for payment interface theming"
                />

                {/* Test Environment Settings */}
                {formData.testMode && (
                  <Card title="Test Environment Settings" sectioned>
                    <FormLayout>
                      <TextField
                        label="Test Gateway URL"
                        value={formData.testGatewayUrl || ''}
                        onChange={(value) => setFormData({ ...formData, testGatewayUrl: value })}
                        placeholder="https://api.test.fingrid.com"
                      />
                      <TextField
                        label="Test Client ID"
                        value={formData.testClientId || ''}
                        onChange={(value) => setFormData({ ...formData, testClientId: value })}
                      />
                      <TextField
                        label="Test Client Secret"
                        type="password"
                        value={formData.testClientSecret || ''}
                        onChange={(value) => setFormData({ ...formData, testClientSecret: value })}
                      />
                      <TextField
                        label="Test Connected Account"
                        value={formData.testConnectedAccount || ''}
                        onChange={(value) => setFormData({ ...formData, testConnectedAccount: value })}
                      />
                    </FormLayout>
                  </Card>
                )}

                {/* Production Environment Settings */}
                {!formData.testMode && (
                  <Card title="Production Environment Settings" sectioned>
                    <FormLayout>
                      <TextField
                        label="Live Gateway URL"
                        value={formData.liveGatewayUrl || ''}
                        onChange={(value) => setFormData({ ...formData, liveGatewayUrl: value })}
                        placeholder="https://api.fingrid.com"
                      />
                      <TextField
                        label="Live Client ID"
                        value={formData.liveClientId || ''}
                        onChange={(value) => setFormData({ ...formData, liveClientId: value })}
                      />
                      <TextField
                        label="Live Client Secret"
                        type="password"
                        value={formData.liveClientSecret || ''}
                        onChange={(value) => setFormData({ ...formData, liveClientSecret: value })}
                      />
                      <TextField
                        label="Live Connected Account"
                        value={formData.liveConnectedAccount || ''}
                        onChange={(value) => setFormData({ ...formData, liveConnectedAccount: value })}
                      />
                    </FormLayout>
                  </Card>
                )}

                {/* Order Status Mappings */}
                <Card title="Order Status Mappings" sectioned>
                  <FormLayout>
                    <Select
                      label="Post-Transaction Status"
                      options={statusOptions}
                      value={formData.postTransactionStatus}
                      onChange={(value) => setFormData({ ...formData, postTransactionStatus: value })}
                      helpText="Order status immediately after payment submission"
                    />
                    <Select
                      label="Webhook Success Status"
                      options={statusOptions}
                      value={formData.webhookSuccessStatus}
                      onChange={(value) => setFormData({ ...formData, webhookSuccessStatus: value })}
                      helpText="Order status when payment succeeds"
                    />
                    <Select
                      label="Webhook Failed Status"
                      options={statusOptions}
                      value={formData.webhookFailedStatus}
                      onChange={(value) => setFormData({ ...formData, webhookFailedStatus: value })}
                      helpText="Order status when payment fails"
                    />
                  </FormLayout>
                </Card>

                <Button primary submit loading={isLoading}>
                  Save Settings
                </Button>
              </FormLayout>
            </Form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}