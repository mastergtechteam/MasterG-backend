import AWS from 'aws-sdk';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  try {
    const { id } = event.pathParameters;
    const data = JSON.parse(event.body);

    const params = {
      TableName: process.env.RETAILER_TABLE,
      Key: { retailerId: id },
      UpdateExpression: 'set #storeName = :storeName, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#storeName': 'storeName',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':storeName': data.storeName,
        ':updatedAt': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    };

    const result = await dynamoDb.update(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Retailer updated successfully', data: result.Attributes }),
    };
  } catch (error) {
    console.error('Error updating retailer:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Error updating retailer', error: error.message }),
    };
  }
};