import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { fromIni } from "@aws-sdk/credential-providers";

const client = new DynamoDBClient({
  region: "ap-south-1",
  credentials: fromIni({ profile: "prod" })
});

const docClient = DynamoDBDocumentClient.from(client);

const STAGE = process.env.STAGE || "prod";
const TABLE_NAME = `ServicePincodeTable-${STAGE}`;

const lucknowPincodes = [
  "226001","226002","226003","226004","226005",
  "226006","226007","226008","226009","226010",
  "226011","226012","226013","226014","226015",
  "226016","226017","226018","226019","226020",
  "226021","226022","226023","226024","226025",
  "226026","226027","226028","226029","226030",
  "226031"
];

async function seedData() {
  for (const pincode of lucknowPincodes) {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pincode,
          city: "Lucknow",

          status: "ACTIVE",      //  REQUIRED
          isDeleted: false,      //  REQUIRED

          is_active: true,       // optional (public API ke liye)
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      })
    );
  }
  console.log(" Lucknow pincodes inserted successfully");
}

seedData();