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
