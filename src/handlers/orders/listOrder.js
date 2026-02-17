import AWS from "aws-sdk";
const db = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.ORDERS_TABLE;

export const handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {};
    const { retailerId, pageSize = 10 } = qs;

    let data;

    /* ================= RETAILER MODE ================= */
    if (retailerId) {
      data = await db.query({
        TableName: TABLE,
        IndexName: "retailerId-createdAt-index",
        KeyConditionExpression: "retailerId = :r",
        FilterExpression: "isDeleted = :f",
        ExpressionAttributeValues: {
          ":r": retailerId,
          ":f": false
        },
        Limit: Number(pageSize),
        ScanIndexForward: false
      }).promise();

    /* ================= ADMIN MODE ================= */
    } else {
      data = await db.scan({
        TableName: TABLE,
        FilterExpression: "isDeleted = :f AND SK = :sk",
        ExpressionAttributeValues: {
          ":f": false,
          ":sk": "METADATA"
        },
        Limit: Number(pageSize)
      }).promise();
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        count: data.Items.length,
        data: data.Items
      })
    };

  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success:false, message: err.message })
    };
  }
};
