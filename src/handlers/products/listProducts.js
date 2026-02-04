import AWS from 'aws-sdk';
const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {};
    const pageSize = Number(qs.pageSize) || 20;
    const lastKey = qs.lastKey ? JSON.parse(qs.lastKey) : null;

    const result = await dynamoDb.scan({
      TableName: process.env.PRODUCTS_TABLE,
      Limit: pageSize,
      ExclusiveStartKey: lastKey
    }).promise();

    const items = result.Items || [];

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "All products fetched",
        pagination: {
          pageSize,
          nextPageKey: result.LastEvaluatedKey || null
        },
        data: items.map(p => ({
          productId: p.productId,
          name: p.name,
          category: p.category,
          sellingPrice: p.pricing?.sellingPrice || 0,
          stock: p.stock?.availableQuantity || 0,
          status: p.status
        }))
      })
    };

  } catch (err) {
    console.error("LIST ALL PRODUCTS ERROR:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
