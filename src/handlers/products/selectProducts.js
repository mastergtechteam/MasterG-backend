// src/handlers/products/selectProducts.handler.js
import AWS from "aws-sdk"
const db = new AWS.DynamoDB.DocumentClient()

export const handler = async (event) => {
  const qs = event.queryStringParameters || {}
  const pageSize = Number(qs.pageSize) || 20
  const lastKey = qs.lastKey ? JSON.parse(qs.lastKey) : null
  const search = qs.search?.toLowerCase()

  let result = await db.scan({
    TableName: process.env.PRODUCTS_TABLE,
    Limit: pageSize,
    ExclusiveStartKey: lastKey
  }).promise()

  let items = result.Items || []

  // 🔍 Search filter (safe)
  if (search) {
    items = items.filter(p =>
      p.name?.toLowerCase().includes(search)
    )
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      data: items.map(p => ({
        value: p.productId,
        label: p.name
      })),
      nextKey: result.LastEvaluatedKey
        ? JSON.stringify(result.LastEvaluatedKey)
        : null
    })
  }
}
