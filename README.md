# Worldcoin App Backend

A simple app to store a binary Merkle tree and an API to retrieve certain infomation about the tree. Use typescript/javascript for implementation, AWS CDK for deployment.
The code is designed in a way that it can be extensible to add new endpoints and store a huge number of nodes in dynamoDB.

## APIs
* `generate` creates a static merkle tree with leave node data ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    * Run `curl -X POST https://8tr17t0v73.execute-api.us-east-1.amazonaws.com/prod/generate`, it will trigger a deployed AWS Lambda and return you the merkle tree. 
    * `generate-sample.json` has a sample return of this API
* `retrieve` return the value of value of the node, in the format of {index, depth, offset, data?}
    * run `curl -X GET https://8tr17t0v73.execute-api.us-east-1.amazonaws.com/prod/retrieve\?index\=1`, it will trigger a deployed AWS Lambda and return you the node info. Please use index [0, 14]
    * `get-sample.json` has a sample return of this API

## How to run the project
* Decompress the zip, and cd into project root
* Assume you have set up your aws config and bootstrapped the ClouedFormation stack
    * [This link](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html) to help you AWS CLI setup   
    * Run `cdk bootstrap aws://ACCOUNT-NUMBER/REGOIN` once for ClouedFormation bootstrap
* Install dep by running `npm install`
* Run `cdk deploy` to deploy the app in Lambda. 
    * You might run into `ENOENT: no such file or directory` if using Mac with Apple Silicon.
    * If you run into error `Error: Cannot find module './util'`, try reinstall the node_modules by running `rm -rf node_modules && npm install`
* Run `curl -X POST https://<your-build>.execute-api.us-east-1.amazonaws.com/prod/generate` to generate a static merkle tree
* Run `curl -X GET https://<your-build>.execute-api.us-east-1.amazonaws.com/prod/retrieve\?index\=<your-index>` to retrieve data

## Deisgn
* I chose to use DynamoDB over S3, for the reasons 1) Overhead of (de)serializing can be non-trivial after number of leaves grows sigfinicantly 2) DynamoDB natively support scaling and query. 
    * Schema
        * index, index of whole nodes of tree starting from 0. Index is from top to bottom, left to right. For example, a full binary tree with 3 nodes, index would be 0, 1, 2.
        * depth, the depth of the current node, with depth root = 0. For non-root node, depth is defined as the shortest distance to reach the root.
        * offset, the zero-index of the node with its peer of the same depth. For example, a full binary tree [0, 1, 2, 3, 4, 5, 6], the offset of node 5 is 2.
        * hash, for leave nodes, hash is the hash of the input (in our static impl, the input of hash is just a single char). For non-leaf nodes, hash is the hash of concat'd hashes of its children.
    * Partition key is `index`, no sortKey since we just want to retrieve by index.
* For code orchestration, each folder should have a clear boundary as follows
    * `/endpoint` defines the endpoints used in `worldcoin_app_backend-stack.ts`. It should also do some mapping and sanity checks before hand over the computation to controller.
    * `/controller` hosts all business logic and complex computation, such as `generateMerkleTree()` or `generateMerkleProof()`
    * `/reposiroty` defines DB/cache interfaces. Methods defined here should be generic and atomic such as `get()` or `update()`. It abstracts the DB connection away from controller.
    * `/test` for unit and integration test, omitted for now.
    * `lib` define WorldcoinAppBackendStack, which is app-level config such as endpoint binding.
* However, due to some export/import issue, I have to host all functions under /endpoint folder. For conceptual demonstration, I have split `generateMerkleTree()` and `upsertItem()` into a separate function.

## Issues during dev
* On mac with Apple Silicon, `cdk init ...` will force using NODE 16. Then a big red block popped up "Node 16 has readched end-of-life on ...."
    * This happened even I tried using NODE 18 by `nvm use 18` 
* On mac with Apple Silicon, `cdk` commands errors out with message `ENOENT: no such file or directory, open 'cdk.out/manifest.json'`.
    * Didn't find a good solution, I just borrowed another laptop 
* Cannot export/import functions. Got error `Runtime.ImportModuleError`, with detailed error message shared in `/endpoint/generate-merkle-tree.js`
    * I tried several syntax to export and import, none of these worked
    * I also tried moving /node_modules and packge.json into /nodejs but it didn't work for me.
* In assignment page 5, Response uses "index". I use offset to make it more clear since we use "index" in the request body.

## Area of improvement
* Add robust error handling for DB method such as `dynamoDBClient.send()`. Due to the simplicity of this app, we just log error when PutItemCommand errors out and 
 assume GetItemCommand always succeeded.
* Add unit tests to go through all possible error cases and integration tests for generate and retrieve endpoint
* This app assumes Merkle Tree has been generated at the moment of retrival, but in case a user runs the app from scratch and call retrieve endpoint without generating the merkle tree, App will return "Internal error" since this behavior is not defined. 
* [Open discussion] Should we define a shared data entity (more often called Data Access Object) for ts/js project? This is common in other static languages but I am not quite sure if it still applies here. 