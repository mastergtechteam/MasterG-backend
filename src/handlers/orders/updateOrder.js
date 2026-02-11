import AWS from "aws-sdk";
const db = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.ORDERS_TABLE;

const ORDER_STATUS = ["PLACED","ACCEPTED","PACKED","OUT_FOR_DELIVERY","DELIVERED","CANCELLED"];
const PAYMENT_STATUS = ["PENDING","SUCCESS","FAILED","REFUNDED"];

export const handler = async (event) => {
  try {
    const { orderId } = event.pathParameters;
    const body = JSON.parse(event.body);

    if (!ORDER_STATUS.includes(body.orderStatus))
      throw new Error("Invalid order status");

    if (body.payment?.status && !PAYMENT_STATUS.includes(body.payment.status))
      throw new Error("Invalid payment status");

    await db.update({
      TableName: TABLE,
      Key: { orderId, SK: "METADATA" },
      ConditionExpression: "attribute_exists(orderId)",
      UpdateExpression: "set orderStatus=:s, payment=:p, delivery=:d",
      ExpressionAttributeValues: {
        ":s": body.orderStatus,
        ":p": body.payment,
        ":d": body.delivery
      }
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ success:true, message:"Order updated successfully" })
    };

  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ success:false, message: err.message }) };
  }
};
