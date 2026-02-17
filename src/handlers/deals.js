import AWS from 'aws-sdk';
import { v4 as uuid } from "uuid";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

//  Deals Create Api

export const createDeal = async (event) => {
    try {
      const body = JSON.parse(event.body);
  
      const deal = {
        dealId: uuid(),
        photo: body.photo,
        heading: body.heading,
        subheading: body.subheading,
        isBanner: body.isBanner,
        items: body.items,
        isDeleted: "false",
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
  
      await dynamoDb.put({
        TableName: process.env.DEALS_TABLE,
        Item: deal,
      }).promise();
  
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deal),
      };
  
    } catch (err) {
      console.error("CREATE DEAL ERROR:", err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: err.message }),
      };
    }
  };
  

// Deals Get Api

export const getDeals = async () => {
    try {
      const data = await dynamoDb.query({
        TableName: process.env.DEALS_TABLE,
        IndexName: "isDeleted-index",
        KeyConditionExpression: "isDeleted = :d",
        ExpressionAttributeValues: { ":d": "false" },
      }).promise();
  
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.Items),
      };
  
    } catch (err) {
      console.error("GET DEALS ERROR:", err);
      return { statusCode: 500, body: err.message };
    }
  };
  
  

  
// Deals Update Api

export const updateDeal = async (event) => {
    try {
      const id = event.pathParameters.id;
      const body = typeof event.body === "string"
        ? JSON.parse(event.body)
        : event.body;
  
      await dynamoDb.update({
        TableName: process.env.DEALS_TABLE,
        Key: { dealId: id },
  
        UpdateExpression: "SET #p=:p, #h=:h, #s=:s, #b=:b, #i=:i, #u=:u",
  
        ExpressionAttributeNames: {
          "#p": "photo",
          "#h": "heading",
          "#s": "subheading",
          "#b": "isBanner",
          "#i": "items",       // 🔥 FIX
          "#u": "updatedAt"
        },
  
        ExpressionAttributeValues: {
          ":p": body.photo, 
          ":h": body.heading,
          ":s": body.subheading,
          ":b": body.isBanner,
          ":i": body.items || [],
          ":u": new Date().toISOString(),
        },
  
      }).promise();
  
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Deal updated" }),
      };
  
    } catch (err) {
      console.error("UPDATE DEAL ERROR:", err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: err.message }),
      };
    }
  };
  

  
// Deals Delete Api

export const deleteDeal = async (event) => {
    const id = event.pathParameters.id;
  
    await dynamoDb.update({
      TableName: process.env.DEALS_TABLE,
      Key: { dealId: id },
      UpdateExpression: "set isDeleted=:d, deletedAt=:t",
      ExpressionAttributeValues: {
        ":d": "true",
        ":t": new Date().toISOString(),
      },
    }).promise();
  
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Deal soft deleted" }),
    };
  };
  
  
// Deals Get By Id Api

export const getDealById = async (event) => {
    try {
      const id = event.pathParameters.id;
  
      const data = await dynamoDb.get({
        TableName: process.env.DEALS_TABLE,
        Key: { dealId: id },
      }).promise();
  
      if (!data.Item || data.Item.isDeleted === "true") {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: "Deal not found" }),
        };
      }
  
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.Item),
      };
  
    } catch (err) {
      console.error("GET DEAL BY ID ERROR:", err);
      return { statusCode: 500, body: err.message };
    }
  };
  
  // Deals Get Banners Api

  export const toggleDealBanner = async (event) => {
    try {
      const id = event.pathParameters.id;
      const body = JSON.parse(event.body);
  
      await dynamoDb.update({
        TableName: process.env.DEALS_TABLE,
        Key: { dealId: id },
        UpdateExpression: "SET isBanner=:b, updatedAt=:u",
        ExpressionAttributeValues: {
          ":b": body.status,
          ":u": new Date().toISOString(),
        },
      }).promise();
  
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Banner status updated" }),
      };
  
    } catch (err) {
      console.error("TOGGLE BANNER ERROR:", err);
      return { statusCode: 500, body: err.message };
    }
  };
  