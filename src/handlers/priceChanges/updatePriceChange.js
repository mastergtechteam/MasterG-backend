import AWS from "aws-sdk";
const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  try {
    const { id } = event.pathParameters;
    const data = JSON.parse(event.body);

    const params = {
      TableName: process.env.PRICE_CHANGES_TABLE,
      Key: { priceChangeId: id },
      UpdateExpression: `
        SET productId = :pid,
            productName = :pn,
            changePercent = :cp,
            expectedDate = :ed,
            #type = :t,
            #status = :s,
            updatedAt = :ua
      `,
      ExpressionAttributeNames: {
        "#type": "type",
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":pid": data.productId,
        ":pn": data.productName,
        ":cp": Number(data.changePercent),
        ":ed": data.expectedDate,
        ":t": data.type,
        ":s": data.status,
        ":ua": new Date().toISOString()
      }
    };

    await dynamoDb.update(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Price change updated successfully"
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};