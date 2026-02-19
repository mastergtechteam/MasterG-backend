import AWS from 'aws-sdk'
const db = new AWS.DynamoDB.DocumentClient()
const s3 = new AWS.S3();

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
    const { productId, imageUrl } = JSON.parse(event.body || "{}");

    if (!productId || !imageUrl) {
      return { statusCode: 400, body: JSON.stringify({ success:false, message:"productId & imageUrl required" }) };
    }

    // 1️⃣ Get product
    const product = await dynamoDb.get({
      TableName: process.env.PRODUCTS_TABLE,
      Key: { productId }
    }).promise();

    if (!product.Item) {
      return { statusCode: 404, body: JSON.stringify({ success:false, message:"Product not found" }) };
    }

    const images = product.Item.images || [];
    const updatedImages = images.filter(img => img !== imageUrl);

    if (images.length === updatedImages.length) {
      return { statusCode: 400, body: JSON.stringify({ success:false, message:"Image not found" }) };
    }

    // 2️⃣ Update DynamoDB
    await dynamoDb.update({
      TableName: process.env.PRODUCTS_TABLE,
      Key: { productId },
      UpdateExpression: "SET images = :images, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":images": updatedImages,
        ":updatedAt": new Date().toISOString()
      }
    }).promise();

    // 3️⃣ Delete from S3 (best effort)
    if (imageUrl.includes(".amazonaws.com/")) {
      const s3Key = imageUrl.split(".amazonaws.com/")[1];
      if (s3Key) {
        await s3.deleteObject({
          Bucket: process.env.S3_BUCKET,
          Key: s3Key
        }).promise();
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Image deleted",
        images: updatedImages
      })
    };

  } catch (err) {
    console.error("DELETE IMAGE ERROR:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success:false, message:"Failed to delete image" })
    };
  }
};

