import AWS from 'aws-sdk'
const dynamoDb = new AWS.DynamoDB.DocumentClient()

export const handler = async (event) => {
  try {
    const q = event.queryStringParameters?.q?.toLowerCase().trim()

    if (!q) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Search query required" })
      }
    }

    /* ===============================
       STEP 1 → CATEGORY MATCH (ACTIVE)
    =============================== */

    const categoryData = await dynamoDb.scan({
      TableName: process.env.CATEGORY_TABLE,
      FilterExpression: "#status = :active AND isDeleted = :false",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":active": "ACTIVE",
        ":false": false
      }
    }).promise()

    const matchedCategory = categoryData.Items.find(cat =>
      cat.name?.toLowerCase().includes(q)
    )

    if (matchedCategory) {

      const productResult = await dynamoDb.query({
        TableName: process.env.PRODUCTS_TABLE,
        IndexName: "categoryId-createdAt-index",
        KeyConditionExpression: "categoryId = :cid",
        FilterExpression: "#status = :active AND isDeleted = :false",
        ExpressionAttributeNames: {
          "#status": "status"
        },
        ExpressionAttributeValues: {
          ":cid": matchedCategory.categoryId,
          ":active": "ACTIVE",
          ":false": false
        }
      }).promise()

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          type: "CATEGORY_MATCH",
          count: productResult.Items.length,
          data: productResult.Items
        })
      }
    }

    /* ===============================
       STEP 2 → PRODUCT NAME MATCH
       (PRODUCT + CATEGORY BOTH ACTIVE)
    =============================== */

    const productData = await dynamoDb.scan({
      TableName: process.env.PRODUCTS_TABLE,
      FilterExpression: "#status = :active AND isDeleted = :false",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":active": "ACTIVE",
        ":false": false
      }
    }).promise()

    const filteredProducts = productData.Items.filter(item =>
      item.name?.toLowerCase().includes(q)
    )

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        type: "PRODUCT_MATCH",
        count: filteredProducts.length,
        data: filteredProducts
      })
    }

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }
}
