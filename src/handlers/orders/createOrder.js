import AWS from "aws-sdk";
const db = new AWS.DynamoDB.DocumentClient();

const ORDERS_TABLE = process.env.ORDERS_TABLE;
const RETAILER_TABLE = process.env.RETAILER_TABLE;
const PRODUCT_TABLE = process.env.PRODUCTS_TABLE;

const ORDER_STATUS = ["PLACED","ACCEPTED","PACKED","OUT_FOR_DELIVERY","DELIVERED","CANCELLED"];
const PAYMENT_MODES = ["COD","UPI","CARD","WALLET"];

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    /* ================= VALIDATION ================= */

    if (!body.retailerId) throw new Error("retailerId is required");
    if (!Array.isArray(body.items) || body.items.length === 0) throw new Error("items required");

    /* ================= RETAILER CHECK ================= */

    const retailer = await db.get({
      TableName: RETAILER_TABLE,
      Key: { retailerId: body.retailerId }
    }).promise();

    if (!retailer.Item) throw new Error("Invalid retailerId");

    /* ================= PRODUCT CHECK ================= */

    const productKeys = body.items.map(i => ({ productId: i.productId }));

    const products = await db.batchGet({
      RequestItems: {
        [PRODUCT_TABLE]: { Keys: productKeys }
      }
    }).promise();

    if (products.Responses[PRODUCT_TABLE].length !== body.items.length)
      throw new Error("One or more productId invalid");

    /* ================= SERVER TOTAL CALC ================= */

    let itemTotal = 0;
    body.items.forEach(i => {
      itemTotal += i.price * i.quantity;
    });

    const orderId = "ORD" + Date.now();
    const createdAt = new Date().toISOString();

    const orderItem = {
      orderId,
      SK: "METADATA",
      retailerId: body.retailerId,
      items: body.items,
      billing: {
        itemTotal,
        deliveryCharge: body.billing?.deliveryCharge || 0,
        discount: body.billing?.discount || 0,
        tax: body.billing?.tax || 0,
        grandTotal: itemTotal
          + (body.billing?.deliveryCharge || 0)
          - (body.billing?.discount || 0)
          + (body.billing?.tax || 0)
      },
      payment: {
        mode: body.payment?.mode || "COD",
        status: "PENDING"
      },
      delivery: body.delivery,
      orderStatus: "PLACED",
      isDeleted: false,
      createdAt
    };

    /* ================= TRANSACTION WRITE ================= */

    await db.transactWrite({
      TransactItems: [
        {
          Put: {
            TableName: ORDERS_TABLE,
            Item: orderItem,
            ConditionExpression: "attribute_not_exists(orderId)"
          }
        }
      ]
    }).promise();

    /* ================= SUCCESS RESPONSE ================= */

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Order placed successfully",
        data: {
          orderId,
          orderStatus: "PLACED",
          grandTotal: orderItem.billing.grandTotal
        }
      })
    };

  } catch (err) {

    console.error("ORDER ERROR:", err);

    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        message: err.message || "Order failed"
      })
    };
  }
};
