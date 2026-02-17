import AWS from 'aws-sdk'
const db = new AWS.DynamoDB.DocumentClient()

export const handler = async (event) => {
  try {
    const id = event.pathParameters?.id

    if (!id) {
      return response(400, { message: "productId is required" })
    }

    const body = typeof event.body === "string"
      ? JSON.parse(event.body)
      : event.body || {}

    const status = body.status

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return response(400, { message: "Invalid status value" })
    }

    const result = await db.update({
      TableName: process.env.PRODUCTS_TABLE,
      Key: { productId: id },
      UpdateExpression: "SET #status = :s, updatedAt = :u",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":s": status,
        ":u": new Date().toISOString()
      },
      ReturnValues: "ALL_NEW"
    }).promise()

    return response(200, {
      success: true,
      message: "Product status updated",
      data: result.Attributes
    })

  } catch (error) {
    console.error("STATUS UPDATE ERROR:", error)
    return response(500, { message: error.message })
  }
}

const response = (statusCode, body) => ({
  statusCode,
  body: JSON.stringify(body)
})
