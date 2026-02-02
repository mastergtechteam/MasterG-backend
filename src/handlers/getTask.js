import AWS from 'aws-sdk';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2)); // Log the event for debugging

  try {
    const params = {
      TableName: process.env.TASKS_TABLE, // Ensure this environment variable is set
    };

    console.log('DynamoDB scan params:', params); // Log the DynamoDB parameters

    const result = await dynamoDb.scan(params).promise();

    console.log('DynamoDB scan result:', result); // Log the result from DynamoDB

    return {
      statusCode: 200,
      body: JSON.stringify(result.Items),
    };
  } catch (error) {
    console.error('Error fetching tasks:', error); // Log the error
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Could not fetch tasks' }),
    };
  }
};