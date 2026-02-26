import AWS from "aws-sdk";
const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  try {
    const data = JSON.parse(event.body);

    const pincodeId = "PIN" + data.pincode;

    const params = {
      TableName: process.env.SERVICE_PINCODE_TABLE,
      Item: {
        pincodeId,
        pincode: data.pincode,
        city: data.city,

        status: "ACTIVE",
        isDeleted: false,

        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    await dynamoDb.put(params).promise();

    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        message: "Pincode created successfully",
        data: params.Item
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