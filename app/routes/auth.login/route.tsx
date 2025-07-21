import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import {
  AppProvider as PolarisAppProvider,
  Button,
  Card,
  FormLayout,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import polarisTranslations from "@shopify/polaris/locales/en.json";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { login } from "../../shopify.server";

import { loginErrorMessage } from "./error.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    console.log('Auth login loader: Starting...');
    console.log('Environment check:', {
      hasApiKey: !!process.env.SHOPIFY_API_KEY,
      hasApiSecret: !!process.env.SHOPIFY_API_SECRET,
      hasAppUrl: !!process.env.SHOPIFY_APP_URL,
      hasScopes: !!process.env.SCOPES,
    });
    
    const loginResult = await login(request);
    console.log('Auth login loader: Login result type:', typeof loginResult);
    const errors = loginErrorMessage(loginResult);
    console.log('Auth login loader: Processed errors:', errors);

    return { errors, polarisTranslations };
  } catch (error) {
    console.error('Auth login loader error:', error);
    return { 
      errors: { shop: 'Authentication system error. Please try again.' }, 
      polarisTranslations 
    };
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    console.log('Auth login action: Starting...');
    const loginResult = await login(request);
    console.log('Auth login action: Login result:', loginResult);
    const errors = loginErrorMessage(loginResult);
    console.log('Auth login action: Processed errors:', errors);

    return {
      errors,
    };
  } catch (error) {
    console.error('Auth login action error:', error);
    return {
      errors: { shop: 'Authentication failed. Please try again.' },
    };
  }
};

export default function Auth() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  return (
    <PolarisAppProvider i18n={loaderData.polarisTranslations}>
      <Page>
        <Card>
          <Form method="post">
            <FormLayout>
              <Text variant="headingMd" as="h2">
                Log in
              </Text>
              <TextField
                type="text"
                name="shop"
                label="Shop domain"
                helpText="example.myshopify.com"
                value={shop}
                onChange={setShop}
                autoComplete="on"
                error={errors.shop}
              />
              <Button submit>Log in</Button>
            </FormLayout>
          </Form>
        </Card>
      </Page>
    </PolarisAppProvider>
  );
}
