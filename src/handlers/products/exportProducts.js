import AWS from 'aws-sdk'
const dynamoDb = new AWS.DynamoDB.DocumentClient()



export const handler = async (event) => {
    const categoryId = event.queryStringParameters?.categoryId
  
    let items = []
    let lastKey = null
  
    do {
      const res = categoryId
        ? await dynamoDb.query({
            TableName: process.env.PRODUCTS_TABLE,
            IndexName: "categoryId-createdAt-index",
            KeyConditionExpression: "categoryId = :cid",
            ExpressionAttributeValues: { ":cid": categoryId },
            ExclusiveStartKey: lastKey
          }).promise()
        : await dynamoDb.scan({
            TableName: process.env.PRODUCTS_TABLE,
            ExclusiveStartKey: lastKey
          }).promise()
  
      items.push(...res.Items)
      lastKey = res.LastEvaluatedKey
    } while (lastKey)
  
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: items
      })
    }
  }
  