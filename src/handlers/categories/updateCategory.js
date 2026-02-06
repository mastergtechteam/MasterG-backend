import AWS from 'aws-sdk';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  try {
    const id = event.pathParameters?.id;

    const body = typeof event.body === "string"
      ? JSON.parse(event.body)
      : event.body || {};

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "category id is required" })
      };
    }

    const updatedItem = {
      name: body.name,
      image: body.image || "",
      status: body.status || "ACTIVE",
      updatedAt: new Date().toISOString()
    };

    await dynamoDb.update({
      TableName: process.env.CATEGORY_TABLE,
      Key: { categoryId: id },
      UpdateExpression: "SET #name = :n, image = :i, #status = :s, updatedAt = :u",
      ExpressionAttributeNames: {
        "#name": "name",
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":n": updatedItem.name,
        ":i": updatedItem.image,
        ":s": updatedItem.status,
        ":u": updatedItem.updatedAt
      }
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Category updated" })
    };

  } catch (error) {
    console.error("ERROR:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
