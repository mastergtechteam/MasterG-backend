import AWS from 'aws-sdk'
const dynamoDb = new AWS.DynamoDB.DocumentClient()

const num = (v, def = 0) => {
  const n = Number(v)
  return isNaN(n) ? def : n
}

export const handler = async (event) => {
  try {
    const { id } = event.pathParameters
    const data = JSON.parse(event.body)
    const now = new Date().toISOString()

    const params = {
      TableName: process.env.PRODUCTS_TABLE,
      Key: { productId: id },
    
      UpdateExpression: `
  SET #name = :name,
      brand = :brand,
      category = :category,
      categoryId = :categoryId,
      subCategory = :subCategory,
      description = :description,
      pricing = :pricing,
      quantity = :quantity,
      stock = :stock,
      tax = :tax,
      productType = :productType,
      expiry = :expiry,
      manufacturingDetails = :manufacturingDetails,
      barcode = :barcode,
      images = :images,
      #status = :status,
      updatedAt = :updatedAt
`,

    ExpressionAttributeNames: {
        "#name": "name",
        "#status": "status"
      },
 
      ExpressionAttributeValues: {
        ":name": data.name,
        ":brand": data.brand || null,

        ":category": {
          categoryId: data.categoryId,
          name: data.categoryName
        },
        ":categoryId": data.categoryId,
        ":subCategory": data.subCategory || null,

        ":description": data.description || null,

        ":pricing": {
            mrp: num(data.pricing?.mrp),
            sellingPrice: num(data.pricing?.sellingPrice),
            discountPercentage: num(data.pricing?.discountPercentage)
        },

        ":quantity": {
            unit: data.quantity?.unit || "PCS",
            value: num(data.quantity?.value)
        },

        ":stock": {
            availableQuantity: num(data.stock?.availableQuantity),
            minimumThreshold: num(data.stock?.minimumThreshold),
            outOfStock: num(data.stock?.availableQuantity) <= 0
        },

        ":tax": {
            gstApplicable: data.tax?.gstApplicable === true || data.tax?.gstApplicable === 'true',
            gstPercentage: num(data.tax?.gstPercentage)
        },


        ":productType": data.productType,

        ":expiry": {
            expiryRequired: data.expiry?.expiryRequired === true || data.expiry?.expiryRequired === 'true',
            expiryDate: data.expiry?.expiryDate || null
        },

        ":manufacturingDetails": {
          manufacturerName: data.manufacturingDetails.manufacturerName,
          countryOfOrigin: data.manufacturingDetails.countryOfOrigin
        },

        ":barcode": data.barcode || null,
        ":images": data.images || [],
        ":status": data.status || "ACTIVE",

        ":updatedAt": now
      },

      ReturnValues: "ALL_NEW"
    }

    const result = await dynamoDb.update(params).promise()

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Product updated successfully",
        data: result.Attributes
      })
    }

  } catch (error) {
    console.error("Update product error:", error)
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: error.message })
    }
  }
}
