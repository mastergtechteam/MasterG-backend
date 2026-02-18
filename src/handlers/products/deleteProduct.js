import AWS from 'aws-sdk'
const db = new AWS.DynamoDB.DocumentClient()

export const handler = async (event) => {
  try {
    const id = event.pathParameters?.id

    if (!id) {
      return response(400, { message: "productId is required" })
    }

    await db.update({
      TableName: process.env.PRODUCTS_TABLE,
      Key: { productId: id },
      UpdateExpression: "SET isDeleted = :d, updatedAt = :u",
      ExpressionAttributeValues: {
        ":d": true,
        ":u": new Date().toISOString()
      }
    }).promise()

    return response(200, {
      success: true,
      message: "Product deleted"
    })

  } catch (error) {
    console.error("SOFT DELETE ERROR:", error)
    return response(500, { message: error.message })
  }
}

const response = (statusCode, body) => ({
  statusCode,
  body: JSON.stringify(body)
})


// Delete product image handler

export const deleteProductImage = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { productId, imageUrl } = body;

    if (!productId || !imageUrl) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: "productId and imageUrl are required"
        })
      };
    }

    // 🔹 STEP 1: Get product
    const getParams = {
      TableName: process.env.PRODUCTS_TABLE,
      Key: { productId }
    };

    const result = await dynamoDb.get(getParams).promise();

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          message: "Product not found"
        })
      };
    }

    const images = result.Item.images || [];

    // 🔹 STEP 2: Remove image
    const updatedImages = images.filter(img => img !== imageUrl);

    // Agar image mili hi nahi
    if (images.length === updatedImages.length) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: "Image not found in product"
        })
      };
    }

    // 🔹 STEP 3: Update DynamoDB
    const updateParams = {
      TableName: process.env.PRODUCTS_TABLE,
      Key: { productId },
      UpdateExpression: "SET images = :images, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":images": updatedImages,
        ":updatedAt": new Date().toISOString()
      },
      ReturnValues: "UPDATED_NEW"
    };

    await dynamoDb.update(updateParams).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Image deleted successfully",
        images: updatedImages
      })
    };

  } catch (error) {
    console.error("Delete image error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Failed to delete image",
        error: error.message
      })
    };
  }
};

