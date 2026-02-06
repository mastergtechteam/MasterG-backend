import AWS from 'aws-sdk';

const db = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  try {
    console.log("EVENT:", JSON.stringify(event));
    console.log("TABLE:", process.env.CATEGORY_TABLE);

    const id = event.pathParameters?.id;

    const body = typeof event.body === "string"
      ? JSON.parse(event.body)
      : event.body || {};

    const status = body.status;

    if (!id || !status) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "categoryId and status required" }),
      };
    }

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid status value" }),
      };
    }

    const result = await db.update({
      TableName: process.env.CATEGORY_TABLE,
      Key: { categoryId: id },
      UpdateExpression: "SET #status = :s, updatedAt = :u",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":s": status,
        ":u": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Category status updated",
        data: result.Attributes,
      }),
    };

  } catch (error) {
    console.error("STATUS UPDATE ERROR:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
