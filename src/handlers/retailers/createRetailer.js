import AWS from 'aws-sdk';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  try {
    const data = JSON.parse(event.body);

    /* =========================
       Generate Auto Increment RET ID
    ==========================*/
    const counter = await dynamoDb.update({
      TableName: process.env.RETAILER_COUNTER_TABLE,
      Key: { id: "retailer" },
      UpdateExpression: "SET lastNumber = if_not_exists(lastNumber, :start) + :inc",
      ExpressionAttributeValues: {
        ":inc": 1,
        ":start": 0
      },
      ReturnValues: "UPDATED_NEW"
    }).promise();

    const number = counter.Attributes.lastNumber;
    const retailerId = `RET${String(number).padStart(5, '0')}`;

    /* =========================
        Prepare Safe Object
    ==========================*/
    const item = {
      retailerId,
      storeName: data.storeName,
      ownerName: data.ownerName,
      contact: data.contact || null,
      address: data.address || null,
      businessDetails: data.businessDetails || null,
      services: data.services || null,
      inventorySummary: data.inventorySummary || null,
      status: data.status || "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    /* =========================
        Insert Retailer
    ==========================*/
    await dynamoDb.put({
      TableName: process.env.RETAILER_TABLE,
      Item: item
    }).promise();

    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        retailerId,
        message: "Retailer created successfully"
      }),
    };

  } catch (error) {
    console.error("Error creating retailer:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Error creating retailer",
        error: error.message
      }),
    };
  }
};








