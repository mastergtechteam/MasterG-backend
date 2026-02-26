import AWS from "aws-sdk";
const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async () => {
  try {
    const params = {
      TableName: process.env.SERVICE_PINCODE_TABLE,
      FilterExpression: "isDeleted = :d",
      ExpressionAttributeValues: {
        ":d": false
      }
    };

    const result = await dynamoDb.scan(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: result.Items || []
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