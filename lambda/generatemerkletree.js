const crypto = require('crypto');
const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");

exports.handler = async function(event) {

    const tableName = process.env.TABLE_NAME;
    const dynamoDBClient =  new DynamoDBClient({
      region: 'us-east-1',
    });

    // Example data for the Merkle tree
    const data = ['a', 'b', 'c', 'd'];

    // Generate the Merkle tree
    const merkleTreeNodes = generateMerkleTree(data);

    // Log the root hash of the Merkle tree nodes
    for(let i = 0; i < merkleTreeNodes.length; i++) {
        console.log('merkle tree node ' + i  + " index, offset = " + i + "," + merkleTreeNodes[i].offset);
        // save it to DB
        const params = {
          TableName: tableName,
          Item: {
            'index':  {N: `${i}`},
            'offset': {N: `${merkleTreeNodes[i].offset}`},
            'depth': {N: `${merkleTreeNodes[i].depth}`},
            'hash': {S: merkleTreeNodes[i].hash},
          }
        };
        try {
          await dynamoDBClient.send(new PutItemCommand(params));
        } catch (err) {
          console.error('Failed to put the item: ', err);
        }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Merkle tree generated successfully', nodes: merkleTreeNodes}),
    };
}

// generateMerkleTree takes a list of leave node and return a full list of merkle tree node
function generateMerkleTree(data) {
    var depth = Math.ceil(Math.log2(data.length));
    const nodes = data.map((item, index) => ({
        depth: depth,
        offset: index,
        hash: crypto.createHash('sha3-256').update(String(item)).digest('hex'),
        data: item
    }));

    var curLevel = nodes;
    var ret = [];
    while (depth > 0) {
        ret = [...curLevel, ...ret];
        var nextLevel = [];
        for (let i = 0; i < curLevel.length; i += 2) {
          const left = curLevel[i];
          const right = i + 1 < curLevel.length ? curLevel[i + 1] : { hash: ''};
          const combinedHash = crypto.createHash('sha3-256').update(left.hash + right.hash).digest('hex');
          const parentNode = { depth: depth - 1, offset: i/2, hash: combinedHash };
          nextLevel.push(parentNode);
        }
        depth--;
        curLevel = nextLevel;
    }
    ret = [...curLevel, ...ret];
    
    return ret;
}