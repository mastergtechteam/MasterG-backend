import AWS from 'aws-sdk';
const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  try {
    const { id } = event.pathParameters;

    await dynamoDb.update({
      TableName: process.env.PRODUCTS_TABLE,
      Key: { productId: id },
      UpdateExpression: "SET #status = :inactive, updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":inactive": "INACTIVE",
        ":updatedAt": new Date().toISOString()
      }
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Product deactivated successfully"
      })
    };

  } catch (error) {
    console.error("Soft delete error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: "Error deleting product", error: error.message })
    };
  }
};
