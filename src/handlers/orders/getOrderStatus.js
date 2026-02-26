import AWS from "aws-sdk";
const db = new AWS.DynamoDB.DocumentClient();

const ORDERS_TABLE = process.env.ORDERS_TABLE;

const ORDER_FLOW = [
  "PLACED",
  "ACCEPTED",
  "REJECTED",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "FAILED"
];

const TERMINAL_STATUSES = ["REJECTED", "CANCELLED", "FAILED"];

export const handler = async (event) => {
  try {
    const orderId = event.pathParameters?.orderId;
    if (!orderId) throw new Error("orderId is required");

    /* ===== FETCH ORDER ===== */
    const res = await db.get({
      TableName: ORDERS_TABLE,
      Key: {
        orderId,
        SK: "METADATA"
      }
    }).promise();

    if (!res.Item) throw new Error("Order not found");

    const currentStatus = res.Item.orderStatus;

    const currentIndex = ORDER_FLOW.indexOf(currentStatus);

    /* ===== BUILD TRACKING ===== */
    const tracking = ORDER_FLOW.map((status, index) => {

      if (TERMINAL_STATUSES.includes(currentStatus)) {
        return {
          status,
          completed: status === currentStatus,
          current: status === currentStatus,
          pending: false
        };
      }

      return {
        status,
        completed: index < currentIndex,
        current: index === currentIndex,
        pending: index > currentIndex
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        orderId,
        currentStatus,
        tracking
      })
    };

  } catch (err) {
    console.error("GET ORDER STATUS ERROR:", err);
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        message: err.message
      })
    };
  }
};