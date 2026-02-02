import AWS from 'aws-sdk';
const DocumentClient = new AWS.DynamoDB.DocumentClient();

const TASKS_TABLE_NAME = process.env.TASKS_TABLE;

module.exports.handler = async (event) => {
  try {
    const id = event.pathParameters?.id;

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Task ID is required" }),
      };
    }

    const data = JSON.parse(event.body);

    const params = {
      TableName: TASKS_TABLE_NAME,
      Key: {
        id: Number(id), // DynamoDB number type
      },
      UpdateExpression: "set title = :t, description = :d",
      ExpressionAttributeValues: {
        ":t": data.title,
        ":d": data.description,
      },
      ReturnValues: "ALL_NEW",
    };

    const result = await DocumentClient.update(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Task updated successfully",
        data: result.Attributes,
      }),
    };

  } catch (error) {
    console.error("Update error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to update task",
        error: error.message,
      }),
    };
  }
};
