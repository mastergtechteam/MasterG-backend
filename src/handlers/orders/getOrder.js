import AWS from "aws-sdk";
const db = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.ORDERS_TABLE;

const ORDER_STATUS = ["PLACED","ACCEPTED","PACKED","OUT_FOR_DELIVERY","DELIVERED","CANCELLED"];
const PAYMENT_STATUS = ["PENDING","SUCCESS","FAILED","REFUNDED"];

export const handler = async (event) => {
  try {
    const { orderId } = event.pathParameters;
    if (!orderId) throw new Error("orderId required");

    const data = await db.get({
      TableName: TABLE,
      Key: { orderId, SK: "METADATA" }
    }).promise();

    if (!data.Item || data.Item.isDeleted)
      throw new Error("Order not found");

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: data.Item })
    };

  } catch (err) {
    return { statusCode: 404, body: JSON.stringify({ success:false, message: err.message }) };
  }
};
