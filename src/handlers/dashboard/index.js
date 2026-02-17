import AWS from "aws-sdk"

const dynamoDb = new AWS.DynamoDB.DocumentClient()

export const getDashboardStats = async () => {
  try {
    const params = {
      TableName: process.env.RETAILER_COUNTER_TABLE,
      Key: { id: "dashboard" }
    }

    const result = await dynamoDb.get(params).promise()

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: {
          retailers: result.Item?.retailers || 0,
          products: result.Item?.products || 0,
          categories: result.Item?.categories || 0,
          deals: result.Item?.deals || 0
        }
      })
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Failed to fetch dashboard stats",
        error: error.message
      })
    }
  }
}
