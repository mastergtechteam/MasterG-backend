import AWS from "aws-sdk";
const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  try {
    const { pincodeId } = event.pathParameters;

    const params = {
      TableName: process.env.SERVICE_PINCODE_TABLE,
      Key: { pincodeId },
      UpdateExpression: "set isDeleted = :d, updatedAt = :u",
      ExpressionAttributeValues: {
        ":d": true,
        ":u": new Date().toISOString()
      }
    };

    await dynamoDb.update(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Pincode deleted successfully"
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};