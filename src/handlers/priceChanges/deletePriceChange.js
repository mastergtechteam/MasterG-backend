import AWS from "aws-sdk";
const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  try {
    const { id } = event.pathParameters;

    const params = {
      TableName: process.env.PRICE_CHANGES_TABLE,
      Key: { priceChangeId: id }
    };

    await dynamoDb.delete(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Price change deleted successfully"
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};