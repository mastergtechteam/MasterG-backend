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

        subCategory: data.subCategory,
        description: data.description,
        pricing: {
            mrp: Number(data.pricing.mrp),
            sellingPrice: Number(data.pricing.sellingPrice),
            discountPercentage: Number(data.pricing.discountPercentage || 0),
            currency: data.pricing.currency || "INR"
          },
        quantity: {
            unit: data.quantity.unit,   // KG, GM, LTR, PCS
            value: Number(data.quantity.value)
          },
        stock: {
            availableQuantity: Number(data.stock.availableQuantity),
            minimumThreshold: Number(data.stock.minimumThreshold || 0),
            outOfStock: data.stock.availableQuantity <= 0
          },
        tax: {
            gstApplicable: data.tax.gstApplicable,
            gstPercentage: Number(data.tax.gstPercentage || 0)
          },
        productType: data.productType, // PACKAGED / FRESH / PERISHABLE
        expiry: {
            expiryRequired: data.expiry.expiryRequired,
            expiryDate: data.expiry.expiryDate || null
          },
        manufacturingDetails: {
            manufacturer: data.manufacturingDetails.manufacturer,
            countryOfOrigin: data.manufacturingDetails.countryOfOrigin
          },
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
