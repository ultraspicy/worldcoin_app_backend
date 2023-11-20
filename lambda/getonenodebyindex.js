const crypto = require('crypto');
const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");

exports.handler = async function(event) {
    const tableName = process.env.TABLE_NAME;
    const dynamoDBClient =  new DynamoDBClient({
      region: 'us-east-1',
    });

    const {index} = event.queryStringParameters || JSON.parse(event.body || '{}');

    const params = {
        "TableName": tableName,
        "Key": {"index": {"N": `${index}`}}
    };
    console.log("get index " + index);
    const response = await dynamoDBClient.send(new GetItemCommand(params));

    const ind = response.Item.index.N;
    const offset = response.Item.offset.N;
    const hash = response.Item.hash.S;

    return {
        statusCode: 200,
        body: JSON.stringify({ 
            message: 'Get merkle tree node',
            index: ind,
            offset: offset,
            hash: hash
        }),
    };
}