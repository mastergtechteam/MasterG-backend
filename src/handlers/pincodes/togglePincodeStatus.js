import AWS from "aws-sdk";
const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  try {
    // 🔥 IMPORTANT: serverless.yml param name
    const { pincodeId } = event.pathParameters;
    const { is_active } = JSON.parse(event.body);

    if (!pincodeId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: "pincodeId missing in path"
        })
      };
    }

    if (typeof is_active !== "boolean") {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: "is_active must be boolean"
        })
      };
    }

    await dynamoDb.update({
      TableName: process.env.SERVICE_PINCODE_TABLE,
      Key: { pincode: pincodeId }, // 🔥 MAP HERE
      UpdateExpression: "SET is_active = :a, updatedAt = :u",
      ExpressionAttributeValues: {
        ":a": is_active,
        ":u": new Date().toISOString()
      }
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Pincode status updated successfully"
      })
    };
  } catch (error) {
    console.error("Toggle pincode error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};