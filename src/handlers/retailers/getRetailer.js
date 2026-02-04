import AWS from 'aws-sdk';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  try {
    const { id } = event.pathParameters;

    const params = {
      TableName: process.env.RETAILER_TABLE,
      Key: { retailerId: id },
    };

    const result = await dynamoDb.get(params).promise();

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, message: 'Retailer not found' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Retailer fetched successfully', data: result.Item }),
    };
  } catch (error) {
    console.error('Error fetching retailer:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Error fetching retailer', error: error.message }),
    };
  }
};