import AWS from 'aws-sdk'

const dynamoDb = new AWS.DynamoDB.DocumentClient()

export const handler = async (event) => {
  try {
    const data = JSON.parse(event.body)

    /* =========================
       Validate Required Fields
    ==========================*/
    if (!data.retailerId || !data.contact) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: "retailerId and contact are required",
        }),
      }
    }

    /* =========================
       Prepare Retailer Object
    ==========================*/
    const item = {
      retailerId: data.retailerId,     // from frontend
      storeName: data.storeName || null,
      ownerName: data.ownerName || null,
      contact: data.contact,            // required
      address: data.address || null,
      businessDetails: data.businessDetails || null,
      services: data.services || null,
      inventorySummary: data.inventorySummary || null,
      status: data.status || "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    /* =========================
       Insert Retailer
    ==========================*/
    await dynamoDb.put({
      TableName: process.env.RETAILER_TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(retailerId)", // prevent duplicate
    }).promise()

    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        retailerId: data.retailerId,
        message: "Retailer created successfully",
      }),
    }

  } catch (error) {
    console.error("Error creating retailer:", error)

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Error creating retailer",
        error: error.message,
      }),
    }
  }
}
