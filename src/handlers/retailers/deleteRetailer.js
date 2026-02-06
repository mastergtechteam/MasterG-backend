import AWS from 'aws-sdk';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  try {
    const { id } = event.pathParameters;

    const params = {
      TableName: process.env.RETAILER_TABLE,
      Key: { retailerId: id },
      UpdateExpression: 'set #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'INACTIVE',
      },
      ReturnValues: 'ALL_NEW',
    };

    const result = await dynamoDb.update(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Retailer deactivated successfully', data: result.Attributes }),
    };
  } catch (error) {
    console.error('Error deleting retailer:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Error deleting retailer', error: error.message }),
    };
  }
};