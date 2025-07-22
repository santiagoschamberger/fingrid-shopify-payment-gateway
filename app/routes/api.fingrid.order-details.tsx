import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";

// Get order details for Thank You page extension
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  const url = new URL(request.url);
  const orderId = url.searchParams.get("order_id");
  
  if (!orderId) {
    return json({ success: false, error: "Order ID required" }, { status: 400 });
  }

  try {
    // Query order details from Shopify
    const response = await admin.graphql(
      `#graphql
      query getOrder($id: ID!) {
        order(id: $id) {
          id
          name
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          paymentGatewayNames
          customer {
            id
            firstName
            lastName
            email
          }
          lineItems(first: 10) {
            edges {
              node {
                id
                title
                quantity
                originalTotalSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
          createdAt
          updatedAt
        }
      }`,
      {
        variables: {
          id: `gid://shopify/Order/${orderId}`,
        },
      }
    );

    const result = await response.json();
    
    if (result.errors) {
      console.error("GraphQL errors:", result.errors);
      return json({ success: false, error: "Failed to fetch order" }, { status: 500 });
    }

    const order = result.data?.order;
    
    if (!order) {
      return json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // Format order data for extension
    const formattedOrder = {
      id: orderId,
      order_number: order.name,
      total_price: order.totalPriceSet.shopMoney.amount,
      currency: order.totalPriceSet.shopMoney.currencyCode,
      payment_gateway_names: order.paymentGatewayNames,
      customer: order.customer ? {
        id: order.customer.id,
        first_name: order.customer.firstName,
        last_name: order.customer.lastName,
        email: order.customer.email,
      } : null,
      line_items: order.lineItems.edges.map((edge: any) => ({
        id: edge.node.id,
        title: edge.node.title,
        quantity: edge.node.quantity,
        price: edge.node.originalTotalSet.shopMoney.amount,
        currency: edge.node.originalTotalSet.shopMoney.currencyCode,
      })),
      created_at: order.createdAt,
      updated_at: order.updatedAt,
    };

    return json({ 
      success: true, 
      order: formattedOrder 
    });

  } catch (error) {
    console.error("Error fetching order details:", error);
    return json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 });
  }
};