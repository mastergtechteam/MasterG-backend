import AWS from "aws-sdk";
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const ORDERS_TABLE = process.env.ORDERS_TABLE;
const PRICE_CHANGES_TABLE = process.env.PRICE_CHANGES_TABLE;

export const handler = async (event) => {
  const { retailerId } = event.pathParameters;

  try {
    /* ================= DATE RANGES ================= */

    const now = new Date();

    // Current Month
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Previous Month
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    /* ================= FETCH ORDERS ================= */

    const ordersResult = await dynamoDb.query({
      TableName: ORDERS_TABLE,
      IndexName: "retailerId-createdAt-index",
      KeyConditionExpression: "retailerId = :r AND createdAt >= :prev",
      ExpressionAttributeValues: {
        ":r": retailerId,
        ":prev": startOfPreviousMonth.toISOString()
      }
    }).promise();

    const orders = ordersResult.Items || [];

    /* ================= SPLIT MONTHLY ORDERS ================= */

    const currentMonthOrders = orders.filter(o =>
      new Date(o.createdAt) >= startOfCurrentMonth
    );

    const previousMonthOrders = orders.filter(o =>
      new Date(o.createdAt) >= startOfPreviousMonth &&
      new Date(o.createdAt) <= endOfPreviousMonth
    );

    /* ================= CALCULATIONS ================= */

    const currentMonthAmount = currentMonthOrders.reduce(
      (sum, o) => sum + (o.billing?.grandTotal || 0), 0
    );

    const previousMonthAmount = previousMonthOrders.reduce(
      (sum, o) => sum + (o.billing?.grandTotal || 0), 0
    );

    const monthlyChangePercent = previousMonthAmount > 0
      ? (((currentMonthAmount - previousMonthAmount) / previousMonthAmount) * 100).toFixed(2)
      : 100;

    /* ================= CASHBACK (3%) ================= */

    const cashbackAmount = +(currentMonthAmount * 0.03).toFixed(2);

    /* ================= ORDER COUNT ================= */

    const currentOrderCount = currentMonthOrders.length;
    const previousOrderCount = previousMonthOrders.length;

    const orderIncrease = currentOrderCount - previousOrderCount;

    /* ================= UPCOMING PRICE CHANGES ================= */

    const priceChanges = await dynamoDb.scan({
      TableName: PRICE_CHANGES_TABLE
    }).promise();

    /* ================= RESPONSE ================= */

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: {
          monthlyPurchase: {
            amount: currentMonthAmount,
            changePercent: Number(monthlyChangePercent)
          },
          cashbackEarned: {
            amount: cashbackAmount,
            percent: 3
          },
          totalOrders: {
            count: currentOrderCount,
            increaseFromLastMonth: orderIncrease
          },
          savingsFromBulk: {
            amount: cashbackAmount, // future me bulk logic add hoga
            changePercent: Number(monthlyChangePercent)
          },
          upcomingPriceChanges: priceChanges.Items.map(p => ({
            product: p.productName,
            expectedInDays: Math.ceil(
              (new Date(p.expectedDate) - new Date()) / (1000 * 60 * 60 * 24)
            ),
            changePercent: p.changePercent,
            type: p.type
          }))
        }
      })
    };

  } catch (err) {
    console.error("INSIGHTS ERROR:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: err.message
      })
    };
  }
};