import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Fingrid Payment Gateway</h1>
        <p className={styles.text}>
          Accept bank transfer payments with optional discounts. Secure, fast, and integrated with Shopify.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Install App
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Bank Transfer Payments</strong>. Direct bank account payments through Fingrid's secure API with real-time processing.
          </li>
          <li>
            <strong>Customer Bank Management</strong>. Customers can save multiple bank accounts and manage them from their account dashboard.
          </li>
          <li>
            <strong>Discount Integration</strong>. Offer configurable discounts to customers who choose to pay by bank transfer.
          </li>
        </ul>
      </div>
    </div>
  );
}
