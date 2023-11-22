import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import {AttributeType, Table} from 'aws-cdk-lib/aws-dynamodb'

export class WorldcoinAppBackendStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new Table(this, 'dbtable', {
      partitionKey: {name: 'index', type: AttributeType.NUMBER},
    }); 

    const api = new apigw.RestApi(this, 'RestAPI', {
      restApiName: 'RestAPI',
    });

    // define two endpoints 
    const generateMerkleTree = new lambda.Function(this, 'GenMerkleTreeHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('endpoint'),
      handler: 'generate-merkle-tree.handler',
      environment: {
        TABLE_NAME: table.tableName
      }
    });
    const getNodeByIndex = new lambda.Function(this, 'getNodeHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('endpoint'),
      handler: 'get-node-by-index.handler',
      environment: {
        TABLE_NAME: table.tableName
      }
    });

    api.root.addResource('generate').addMethod('POST', new apigw.LambdaIntegration(generateMerkleTree));
    api.root.addResource('retrieve').addMethod('GET', new apigw.LambdaIntegration(getNodeByIndex));

    table.grantReadWriteData(generateMerkleTree);
    table.grantReadWriteData(getNodeByIndex);
  }
}

