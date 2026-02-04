import AWS from 'aws-sdk';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async () => {
  try {
    const params = {
      TableName: process.env.RETAILER_TABLE,
    };

    const result = await dynamoDb.scan(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Retailers fetched successfully',
        count: result.Items.length,
        data: result.Items,
      }),
    };
  } catch (error) {
    console.error('Error fetching retailers:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: 'Error fetching retailers',
        error: error.message,
      }),
    };
  }
};
