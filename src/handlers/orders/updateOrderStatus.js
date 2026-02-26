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

const TERMINAL = ["CANCELLED", "REJECTED", "FAILED", "DELIVERED"];

export const handler = async (event) => {
  try {
    const orderId = event.pathParameters?.orderId;
    const body = JSON.parse(event.body || "{}");

    if (!orderId) throw new Error("orderId required");
    if (!body.newStatus) throw new Error("newStatus required");

    const { newStatus, remark, changedBy = "ADMIN" } = body;

    if (!ORDER_FLOW.includes(newStatus))
      throw new Error("Invalid status");

    if (["CANCELLED", "REJECTED", "FAILED"].includes(newStatus) && !remark)
      throw new Error("Remark required for this status");

    /* ===== FETCH ORDER ===== */
    const res = await db.get({
      TableName: ORDERS_TABLE,
      Key: { orderId, SK: "METADATA" }
    }).promise();

    if (!res.Item) throw new Error("Order not found");

    const currentStatus = res.Item.orderStatus;

    if (TERMINAL.includes(currentStatus))
      throw new Error(`Order already ${currentStatus}`);

    const currentIndex = ORDER_FLOW.indexOf(currentStatus);
    const newIndex = ORDER_FLOW.indexOf(newStatus);

    /* ===== FLOW VALIDATION ===== */
    if (newIndex !== currentIndex + 1 &&
        !["CANCELLED", "REJECTED", "FAILED"].includes(newStatus)) {
      throw new Error(`Invalid status flow: ${currentStatus} → ${newStatus}`);
    }

    const logEntry = {
      status: newStatus,
      by: changedBy,
      remark: remark || null,
      at: new Date().toISOString()
    };

    /* ===== UPDATE ===== */
    await db.update({
      TableName: ORDERS_TABLE,
      Key: { orderId, SK: "METADATA" },
      UpdateExpression: `
        SET orderStatus = :s,
            updatedAt = :u,
            orderStatusLogs = list_append(if_not_exists(orderStatusLogs, :e), :l)
      `,
      ExpressionAttributeValues: {
        ":s": newStatus,
        ":u": new Date().toISOString(),
        ":l": [logEntry],
        ":e": []
      }
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Order status updated",
        newStatus
      })
    };

  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        message: err.message
      })
    };
  }
};