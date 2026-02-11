import AWS from 'aws-sdk'
const dynamoDb = new AWS.DynamoDB.DocumentClient()

export const handler = async (event) => {
  try {
    const { id } = event.pathParameters

    const result = await dynamoDb.get({
      TableName: process.env.PRODUCTS_TABLE,
      Key: { productId: id }
    }).promise()

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          message: "Product not found"
        })
      }
    }

    const p = result.Item

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Product fetched successfully",
        data: {
          productId: p.productId,
          name: p.name || null,
          brand: p.brand || null,
          description: p.description || null,

          category: p.category || {
            categoryId: p.categoryId || null,
            name: p.categoryName || null
          },

          pricing: {
            mrp: p.pricing?.mrp || null,
            sellingPrice: p.pricing?.sellingPrice || null,
            currency: p.pricing?.currency || "INR"
          },

          quantity: p.quantity || null,
          stock: p.stock || null,
          tax: p.tax || null,
          productType: p.productType || null,
          expiry: p.expiry || null,

          manufacturingDetails: {
            manufacturer: p.manufacturingDetails?.manufacturer || null,
            countryOfOrigin: p.manufacturingDetails?.countryOfOrigin || null
          },

          barcode: p.barcode || null,
          images: p.images || [],

          status: p.status || "INACTIVE",

          createdAt: p.createdAt || null,
          updatedAt: p.updatedAt || null,
          isDeleted: p.isDeleted || false
        }
      })
    }

  } catch (err) {
    console.error("GET PRODUCT ERROR:", err)
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: err.message
      })
    }
  }
}

// Batch Product Fetch API


export const batchProducts = async (event) => {
  try {
    const body = JSON.parse(event.body)
    const productIds = body.productIds || []

    if (!productIds.length) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: "productIds required" })
      }
    }

    const result = await dynamoDb.batchGet({
      RequestItems: {
        [process.env.PRODUCTS_TABLE]: {
          Keys: productIds.map(id => ({ productId: id }))
        }
      }
    }).promise()

    const products = result.Responses[process.env.PRODUCTS_TABLE] || []

    const formatted = products.map(p => ({
      productId: p.productId,
      name: p.name || null,
      brand: p.brand || null,
      description: p.description || null,
      category: p.category || null,
      pricing: p.pricing || null,
      quantity: p.quantity || null,
      stock: p.stock || null,
      tax: p.tax || null,
      productType: p.productType || null,
      expiry: p.expiry || null,
      manufacturingDetails: p.manufacturingDetails || null,
      barcode: p.barcode || null,
      images: p.images || [],
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }))

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        count: formatted.length,
        data: formatted
      })
    }

  } catch (err) {
    console.error("BATCH PRODUCT ERROR:", err)
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message })
    }
  }
}
