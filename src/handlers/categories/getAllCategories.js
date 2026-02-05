import AWS from "aws-sdk";

const db = new AWS.DynamoDB.DocumentClient();

export const handler = async () => {
  try {
    console.log("TABLE:", process.env.CATEGORY_TABLE);

    const result = await db.scan({
      TableName: process.env.CATEGORY_TABLE,
      FilterExpression: "attribute_not_exists(isDeleted) OR isDeleted = :d",
      ExpressionAttributeValues: { ":d": false }
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: result.Items })
    };

  } catch (error) {
    console.error("ERROR:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
