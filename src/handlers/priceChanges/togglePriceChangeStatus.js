import AWS from "aws-sdk";
const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  try {
    const { id } = event.pathParameters;
    const { status } = JSON.parse(event.body);

    const params = {
      TableName: process.env.PRICE_CHANGES_TABLE,
      Key: { priceChangeId: id },
      UpdateExpression: "SET #status = :s, updatedAt = :ua",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":s": status,
        ":ua": new Date().toISOString()
      }
    };

    await dynamoDb.update(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Status updated successfully"
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};