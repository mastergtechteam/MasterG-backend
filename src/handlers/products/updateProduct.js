import AWS from 'aws-sdk'
const dynamoDb = new AWS.DynamoDB.DocumentClient()

export const handler = async (event) => {
  try {
    const { id } = event.pathParameters
    const data = JSON.parse(event.body)
    const now = new Date().toISOString()

    const params = {
      TableName: process.env.PRODUCTS_TABLE,
      Key: { productId: id },
      UpdateExpression: `
        SET #name = :name,
            brand = :brand,
            category = :category,
            categoryId = :categoryId,
            description = :description,
            pricing = :pricing,
            quantity = :quantity,
            stock = :stock,
            tax = :tax,
            productType = :productType,
            expiry = :expiry,
            manufacturingDetails = :manufacturingDetails,
            barcode = :barcode,
            images = :images,
            updatedAt = :updatedAt
      `,
      ExpressionAttributeNames: {
        "#name": "name"
      },
      ExpressionAttributeValues: {
        ":name": data.name || "",
        ":brand": data.brand || "",
        ":category": {
          categoryId: data.categoryId,
          name: data.categoryName
        },
        ":categoryId": data.categoryId,
        ":description": data.description || "",
        ":pricing": data.pricing || {},
        ":quantity": data.quantity || 1,
        ":stock": data.stock || 0,
        ":tax": data.tax || 0,
        ":productType": data.productType || "GROCERY",
        ":expiry": data.expiry || null,
        ":manufacturingDetails": data.manufacturingDetails || {},
        ":barcode": data.barcode || "",
        ":images": data.images || [],
        ":updatedAt": now
      },
      ReturnValues: "ALL_NEW"
    }

    const result = await dynamoDb.update(params).promise()

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Product updated successfully",
        data: result.Attributes
      })
    }

  } catch (error) {
    console.error("Update product error:", error)
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: error.message })
    }
  }
}
