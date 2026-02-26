import AWS from "aws-sdk";
const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  try {
    const data = JSON.parse(event.body);

    const priceChangeId = "PC" + Date.now();

    const params = {
      TableName: process.env.PRICE_CHANGES_TABLE,
      Item: {
        priceChangeId,
        productId: data.productId,
        productName: data.productName,

        changePercent: Number(data.changePercent),
        expectedDate: data.expectedDate,

        type: data.type || "INCREASE",   // INCREASE | DECREASE
        status: data.status || "ACTIVE", // ACTIVE | INACTIVE

        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    await dynamoDb.put(params).promise();

    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        message: "Price change created successfully",
        data: params.Item
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};