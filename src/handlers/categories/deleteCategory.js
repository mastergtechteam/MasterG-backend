import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  try {
    const id = event.pathParameters?.id;

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "category id is required" })
      };
    }

    await dynamoDb.update({
      TableName: process.env.CATEGORY_TABLE,
      Key: { categoryId: id },
      UpdateExpression: "SET isDeleted = :d, updatedAt = :u",
      ExpressionAttributeValues: {
        ":d": true,
        ":u": new Date().toISOString()
      }
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Category deleted (soft)" })
    };

  } catch (error) {
    console.error("ERROR:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

  