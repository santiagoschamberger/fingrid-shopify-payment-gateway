import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  InlineStack,
  Banner,
  Icon,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { ShopifyStorageService } from "../services/shopify-storage.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  
  // Get app settings to check if configured
  const storageService = new ShopifyStorageService(session, admin);
  const settings = await storageService.getAppSettings();
  
  return { 
    settings,
    isConfigured: Boolean(settings.testClientId || settings.liveClientId)
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        product: {
          title: `${color} Snowboard`,
        },
      },
    },
  );
  const responseJson = await response.json();

  const product = responseJson.data!.productCreate!.product!;
  const variantId = product.variants.edges[0]!.node!.id!;

  const variantResponse = await admin.graphql(
    `#graphql
    mutation shopifyRemixTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          barcode
          createdAt
        }
      }
    }`,
    {
      variables: {
        productId: product.id,
        variants: [{ id: variantId, price: "100.00" }],
      },
    },
  );

  const variantResponseJson = await variantResponse.json();

  return {
    product: responseJson!.data!.productCreate!.product,
    variant:
      variantResponseJson!.data!.productVariantsBulkUpdate!.productVariants,
  };
};

export default function Index() {
  const { settings, isConfigured } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const shopify = useAppBridge();
  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";
  const productId = fetcher.data?.product?.id.replace(
    "gid://shopify/Product/",
    "",
  );

  useEffect(() => {
    if (productId) {
      shopify.toast.show("Product created");
    }
  }, [productId, shopify]);

  return (
    <Page>
      <TitleBar title="Fingrid Payment Gateway">
        <Link to="/app/settings">
          <Button variant="primary">
            Settings
          </Button>
        </Link>
      </TitleBar>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            {!isConfigured && (
              <Banner
                title="Setup Required"
                tone="warning"
                action={{
                  content: "Configure Settings",
                  url: "/app/settings"
                }}
              >
                Configure your Fingrid API credentials to start accepting bank transfer payments.
              </Banner>
            )}
            
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Welcome to Fingrid Payment Gateway 🏦
                  </Text>
                  <Text variant="bodyMd" as="p">
                    Your secure bank transfer payment solution is ready to go. This app integrates{" "}
                    <strong>Fingrid's payment API</strong> with Shopify to offer customers a seamless 
                    bank transfer payment option with optional discounts.
                  </Text>
                </BlockStack>
                
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">
                    Current Configuration
                  </Text>
                  <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                    <BlockStack gap="200">
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodyMd">Mode:</Text>
                        <Text as="span" variant="bodyMd">
                          {settings.testMode ? "Test Mode" : "Live Mode"}
                        </Text>
                      </InlineStack>
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodyMd">Client Name:</Text>
                        <Text as="span" variant="bodyMd">{settings.clientName || "Not configured"}</Text>
                      </InlineStack>
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodyMd">Discount:</Text>
                        <Text as="span" variant="bodyMd">{settings.discountPercentage}%</Text>
                      </InlineStack>
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodyMd">API Status:</Text>
                        <Text as="span" variant="bodyMd">
                          {isConfigured ? "Configured" : "Needs Setup"}
                        </Text>
                      </InlineStack>
                    </BlockStack>
                  </Box>
                </BlockStack>

                <InlineStack gap="300">
                  <Link to="/app/settings">
                    <Button>
                      Configure Settings
                    </Button>
                  </Link>
                  {isConfigured && (
                    <Link to="/app/additional">
                      <Button variant="plain">
                        View Transactions
                      </Button>
                    </Link>
                  )}
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
          
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Payment Features
                  </Text>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Payment Method
                      </Text>
                      <Text as="span" variant="bodyMd">
                        Bank Transfers
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Processing
                      </Text>
                      <Text as="span" variant="bodyMd">
                        Real-time
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Security
                      </Text>
                      <Text as="span" variant="bodyMd">
                        Bank-grade
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Storage
                      </Text>
                      <Text as="span" variant="bodyMd">
                        Shopify Metafields
                      </Text>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Quick Actions
                  </Text>
                  <List>
                    <List.Item>
                      <Link to="/app/settings">
                        Configure API credentials
                      </Link>
                    </List.Item>
                    <List.Item>
                      <Link to="/app/additional">
                        View transaction reports
                      </Link>
                    </List.Item>
                    <List.Item>
                      Test payment flow in your store
                    </List.Item>
                    <List.Item>
                      Review webhook configurations
                    </List.Item>
                  </List>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
