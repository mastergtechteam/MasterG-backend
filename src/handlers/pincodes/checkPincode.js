import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { pincode } = body;

    if (!pincode) {
      return response(400, {
        success: false,
        message: "Pincode is required"
      });
    }

    const result = await docClient.send(
      new GetCommand({
        TableName: process.env.SERVICE_PINCODE_TABLE,
        Key: { pincode }
      })
    );

    if (!result.Item || result.Item.is_active !== true) {
      return response(200, {
        success: true,
        service_available: false,
        message: "Service not available in your area"
      });
    }

    return response(200, {
      success: true,
      service_available: true,
      city: result.Item.city,
      message: "Service available in your area"
    });

  } catch (err) {
    console.error(err);
    return response(500, {
      success: false,
      message: "Internal server error"
    });
  }
};

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  },
  body: JSON.stringify(body)
});
