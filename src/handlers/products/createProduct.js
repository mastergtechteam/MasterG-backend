import AWS from 'aws-sdk';
const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  try {
    const data = JSON.parse(event.body);
    const productId = "PROD" + Date.now(); 
    const params = {
      TableName: process.env.PRODUCTS_TABLE,
      Item: {
        productId,
        name: data.name,
        brand: data.brand,

        //Category Object
        category: {
          categoryId: data.categoryId,
          name: data.categoryName
        },

        //Required for GSI
        categoryId: data.categoryId,

        description: data.description,
        pricing: data.pricing,
        quantity: data.quantity,
        stock: data.stock,
        tax: data.tax,
        productType: data.productType,
        expiry: data.expiry,
        manufacturingDetails: data.manufacturingDetails,
        barcode: data.barcode,
        images: data.images,
      
        status: data.status || "ACTIVE",
        isDeleted: false, 
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    await dynamoDb.put(params).promise();

    return {
      statusCode: 201,
      body: JSON.stringify({ success: true, message: "Product created successfully" })
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
