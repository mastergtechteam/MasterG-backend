import AWS from 'aws-sdk';
const DocumentClient = new AWS.DynamoDB.DocumentClient();

const TASKS_TABLE_NAME = process.env.TASKS_TABLE;

module.exports.handler = async (event) => {
  try {
    const data = JSON.parse(event.body);

    const params = {
      TableName: TASKS_TABLE_NAME,
      Item: {  
        id: Number(data.id),   
        title: data.title,
        description: data.description,
        status: data.status || "pending",
      },
    };

    await DocumentClient.put(params).promise(); 

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Task created successfully",
        data: params.Item,
      }),
    };

  } catch (error) {
    console.error("Error creating task:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to create task",
        error: error.message,
      }),
    };
  }
};
