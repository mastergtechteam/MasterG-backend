import AWS from "aws-sdk";
const db = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.ORDERS_TABLE;

export const handler = async (event) => {
  try {
    const { orderId } = event.pathParameters;
    const body = JSON.parse(event.body || "{}");

    await db.update({
      TableName: TABLE,
      Key: { orderId, SK: "METADATA" },
      ConditionExpression: "attribute_exists(orderId)",
      UpdateExpression: "set orderStatus=:c, isDeleted=:d, cancelReason=:r",
      ExpressionAttributeValues: {
        ":c": "CANCELLED",
        ":d": true,
        ":r": body.reason || "NA"
      }
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ success:true, message:"Order cancelled successfully" })
    };

  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ success:false, message: err.message }) };
  }
};
