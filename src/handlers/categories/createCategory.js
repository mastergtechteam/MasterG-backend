import AWS from 'aws-sdk';
const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  try {
    const body = typeof event.body === "string"
      ? JSON.parse(event.body)
      : event.body || {};

    if (!body.name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "name is required" })
      };
    }

    const item = {
      categoryId: "CAT" + Date.now(),
      name: body.name,
      image: body.image || "",
      status: body.status || "ACTIVE",
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log("TABLE:", process.env.CATEGORY_TABLE);

    await dynamoDb.put({   // ✅ FIXED HERE
      TableName: process.env.CATEGORY_TABLE,
      Item: item
    }).promise();

    return {
      statusCode: 201,
      body: JSON.stringify({ success: true, data: item })
    };

  } catch (error) {
    console.error("ERROR:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
