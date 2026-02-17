import AWS from 'aws-sdk';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  try {
    const { id } = event.pathParameters;
    const data = JSON.parse(event.body);

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: "Retailer ID required" })
      };
    }

    /* =========================
       Build Dynamic Update
    ==========================*/

    let updateExpression = "set updatedAt = :updatedAt";
    let ExpressionAttributeValues = {
      ":updatedAt": new Date().toISOString()
    };
    let ExpressionAttributeNames = {};

    // Allowed fields to update
    const allowedFields = [
      "storeName",
      "ownerName",
      "contact",
      "address",
      "businessDetails",
      "services",
      "inventorySummary",
      "status"
    ];

    allowedFields.forEach((field) => {
      if (data[field] !== undefined) {
        updateExpression += `, #${field} = :${field}`;
        ExpressionAttributeNames[`#${field}`] = field;
        ExpressionAttributeValues[`:${field}`] = data[field];
      }
    });

    const params = {
      TableName: process.env.RETAILER_TABLE,
      Key: { retailerId: id },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: ExpressionAttributeNames,
      ExpressionAttributeValues: ExpressionAttributeValues,
      ReturnValues: "ALL_NEW"
    };

    const result = await dynamoDb.update(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Retailer updated successfully",
        data: result.Attributes
      }),
    };

  } catch (error) {
    console.error("Error updating retailer:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Error updating retailer",
        error: error.message
      }),
    };
  }
};
