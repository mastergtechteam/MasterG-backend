import AWS from "aws-sdk";
const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  try {
    const { pincodeId } = event.pathParameters;
    const data = JSON.parse(event.body);

    const params = {
      TableName: process.env.SERVICE_PINCODE_TABLE,
      Key: { pincodeId },
      UpdateExpression: "set city = :c, updatedAt = :u",
      ExpressionAttributeValues: {
        ":c": data.city,
        ":u": new Date().toISOString()
      },
      ReturnValues: "ALL_NEW"
    };

    const result = await dynamoDb.update(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Pincode updated successfully",
        data: result.Attributes
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};