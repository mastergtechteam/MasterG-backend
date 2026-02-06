import AWS from 'aws-sdk';
const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  try {
    const { id } = event.pathParameters;

    const result = await dynamoDb.get({
      TableName: process.env.PRODUCTS_TABLE,
      Key: { productId: id }
    }).promise();

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, message: "Product not found" })
      };
    }

    const p = result.Item;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Product fetched successfully",
        data: {
          productId: p.productId,
          name: p.name,
          brand: p.brand,
          category: p.category,
          sellingPrice: p.pricing?.sellingPrice || null,
          availableQuantity: p.stock?.availableQuantity || null,
          unit: p.quantity?.unit || null,
          status: p.status
        }
      })
    };

  } catch (err) {
    console.error("GET PRODUCT ERROR:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
