import AWS from 'aws-sdk';
const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {};
    const pageSize = Number(qs.pageSize) || 20;
    const lastKey = qs.lastKey ? JSON.parse(qs.lastKey) : null;
    const categoryId = qs.categoryId;

    let result;

    // 🎯 CASE 1: Filter exists → FAST Query
    if (categoryId) {
      result = await dynamoDb.query({
        TableName: process.env.PRODUCTS_TABLE,
        IndexName: "categoryId-createdAt-index",
        KeyConditionExpression: "categoryId = :cid",
        ExpressionAttributeValues: { ":cid": categoryId },
        Limit: pageSize,
        ExclusiveStartKey: lastKey,
        ScanIndexForward: false
      }).promise();
    }

    // 📦 CASE 2: No filter → Full list
    else {
      result = await dynamoDb.scan({
        TableName: process.env.PRODUCTS_TABLE,
        Limit: pageSize,
        ExclusiveStartKey: lastKey
      }).promise();
    }

    const items = result.Items || [];

    // ===== CATEGORY NAME JOIN =====
    const categoryIds = [...new Set(items.map(p => p.categoryId).filter(Boolean))];
    let categoryMap = {};

    if (categoryIds.length) {
      const categoryData = await dynamoDb.batchGet({
        RequestItems: {
          [process.env.CATEGORY_TABLE]: {
            Keys: categoryIds.map(id => ({ categoryId: id }))
          }
        }
      }).promise();

      (categoryData.Responses[process.env.CATEGORY_TABLE] || []).forEach(c => {
        categoryMap[c.categoryId] = c.name;
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        pagination: {
          pageSize,
          nextPageKey: result.LastEvaluatedKey
            ? JSON.stringify(result.LastEvaluatedKey)
            : null
        },
        data: items.map(p => ({
          productId: p.productId,
          name: p.name,
          image: p.images?.[0] || null,
          category: {
            categoryId: p.categoryId,
            name: categoryMap[p.categoryId] || "Unknown"
          },
          sellingPrice: p.pricing?.sellingPrice || 0,
          stock: p.stock?.availableQuantity || 0,
          status: p.status
        }))
      })
    };

  } catch (err) {
    console.error("PRODUCT LIST ERROR:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
