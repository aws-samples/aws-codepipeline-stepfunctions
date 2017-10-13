/*
 * Copyright 2012-2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Amazon Software License (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 * http://aws.amazon.com/asl/
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

/**
* Description: Library used to manipulate (create, update, delete) CloudFormation resources (stacks, change-sets)
*/

var AWS = require("aws-sdk");

const STACK_DOES_NOT_EXIST = "STACK-DOES-NOT-EXIST";
const CHANGE_SET_DOES_NOT_EXIST = "CHANGE-SET-DOES-NOT-EXIST";

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

function createRoleSessionName() {
    return "role-session-" + getRandomInt(1, 100001);
}

function assumeRole(roleArn) {
    var roleSessionName = createRoleSessionName();
    var params = {
        RoleArn: roleArn,
        RoleSessionName: createRoleSessionName()
    };
    var sts = new AWS.STS();
    console.log("Assuming role: " + roleArn + ", roleSession: " + RoleSessionName);
    return sts.assumeRole(params).promise()
        .then(data => {
            var accessKeyId = data.Credentials.AccessKeyId;
            var secretAccessKey = data.Credentials.SecretAccessKey;
            var sessionToken = data.Credentials.SessionToken;
            return new AWS.Credentials(accessKeyId, secretAccessKey, sessionToken);
        });
}

function CloudFormationManager(cnfRoleARN = null) {
    this.cnfRoleARN = cnfRoleARN;
    this.cloudFormation = null;
}

CloudFormationManager.prototype.getCloudFormationClient = function () {
    var self = this;
    if (self.cloudFormation != null) {
        return Promise.resolve(self.cloudFormation);
    }
    if (self.cnfRoleARN == null) {
        self.cloudFormation = new AWS.CloudFormation();
        return Promise.resolve(self.cloudFormation);
    }
    return assumeRole(self.cnfRoleARN)
        .then(awsCredentials => {
            self.cloudFormation = new AWS.CloudFormation({
                credentials: awsCredentials
            });
            return Promise.resolve(self.cloudFormation);
        });
}

CloudFormationManager.prototype.getStackStatus = function (stackName) {
    var self = this;
    return self.getCloudFormationClient()
        .then(function (cloudformationClient) {
            var params = {
                StackName: stackName
            };
            console.log("Checking stack status: " + JSON.stringify(params) + "...");
            return cloudformationClient.describeStacks(params).promise();
        })
        .then(function (stacksData) {
            return stacksData['Stacks'][0].StackStatus;
        })
        .catch(function(err) {
            console.log("Got an error while checking stack status. Maybe stack does not exist? Error: " + err.message);
            return STACK_DOES_NOT_EXIST;
        });
}

CloudFormationManager.prototype.getChangeSetStatus = function (stackName, changeSetName) {
    var self = this;
    return self.getCloudFormationClient()
        .then(function (cloudformationClient) {
            var params = {
                ChangeSetName: changeSetName,
                StackName: stackName
            };
            console.log("Checking changeSet status: " + JSON.stringify(params) + "...");
            return cloudformationClient.describeChangeSet(params).promise();
        })
        .then(function (changeSetData) {
            return {
                "status": changeSetData.Status,
                "executionStatus": changeSetData.ExecutionStatus
            }
        })
        .catch(function(err) {
            console.log("Got an error while checking changeSet status. Maybe changeSet does not exist? Error: " + err.message);
            return {
                "status": CHANGE_SET_DOES_NOT_EXIST,
                "executionStatus": CHANGE_SET_DOES_NOT_EXIST
            }
        });
}

CloudFormationManager.prototype.doesStackExist = function (stackName) {
    var self = this;
    return self.getStackStatus(stackName)
        .then(function (status) {
            return status !== STACK_DOES_NOT_EXIST;
        });
}

CloudFormationManager.prototype.hasStackCreationCompleted = function (stackName) {
    var self = this;
    return self.getStackStatus(stackName)
        .then(function (status) {
            if (status === STACK_DOES_NOT_EXIST) {
                return Promise.reject("Cannot find stack: " + stackName);
            }
            if (status == 'CREATE_IN_PROGRESS') {
                return false;
            }
            if (status == 'CREATE_COMPLETE') {
                return true;
            }
            return Promise.reject("Unexpected stack cretion status: " + status);
        });
}

CloudFormationManager.prototype.hasChangeSetCreationCompleted = function (stackName, changeSetName) {
    var self = this;
    return self.getChangeSetStatus(stackName, changeSetName)
        .then(function (result) {
            console.log("ChangeSet information: [changeSet: " + changeSetName + ", stack: " + stackName + ", info: " + JSON.stringify(result) + "]");
            if (result.status === CHANGE_SET_DOES_NOT_EXIST) {
                throw new Error("Cannot find changeSet: " + changeSetName + " for stack: " + stackName);
            }
            if (result.status == 'CREATE_IN_PROGRESS') {
                return false;
            }
            if (result.status == 'CREATE_COMPLETE') {
                return true;
            }
            throw new Error("Unexpected stack creation status: " + result.status + " for changeSet: " + changeSetName + " for stack: " + stackName);
        });
}

CloudFormationManager.prototype.createStack = function (stackName, templateBody, parameters) {
    var self = this;
    var params = {
        StackName: stackName,
        Parameters: parameters,
        TemplateBody: templateBody,
        Capabilities: [
            "CAPABILITY_IAM"
        ]
    };
    return self.getCloudFormationClient()
        .then(function (cloudformation) {
            console.log('Creating stack: ' + stackName + " with params: " + JSON.stringify(params));
            return cloudformation.createStack(params).promise();
        });
}

CloudFormationManager.prototype.createChangeSet = function (stackName, changeSetName, templateBody, parameters) {
    var self = this;
    var params = {
        ChangeSetName: changeSetName,
        StackName: stackName,
        ChangeSetType: "UPDATE",
        Capabilities: [
            "CAPABILITY_IAM"
        ],
        Parameters: parameters,
        TemplateBody: templateBody
    };
    console.log("Creating ChangeSet: " + JSON.stringify(params));
    return self.getCloudFormationClient()
        .then(function (cloudFormation) {
            return cloudFormation.createChangeSet(params).promise();
        });
}

CloudFormationManager.prototype.executeChangeSet = function (stackName, changeSetName) {
    var self = this;
    var params = {
        ChangeSetName: changeSetName,
        StackName: stackName
    };
    console.log("Executing ChangeSet: " + JSON.stringify(params));
    return self.getCloudFormationClient()
        .then(function (cloudFormation) {
            return cloudFormation.executeChangeSet(params).promise();
        });
}

CloudFormationManager.prototype.describeChangeSet = function (stackName, changeSetName) {
    var self = this;
    var params = {
        ChangeSetName: changeSetName,
        StackName: stackName
    };
    console.log("Describing ChangeSet: " + JSON.stringify(params));
    return self.getCloudFormationClient()
        .then(function (cloudFormation) {
            return cloudFormation.describeChangeSet(params).promise();
        });
}

CloudFormationManager.prototype.waitFor = function (stackName, changeSetName, waitState) {
    var self = this;
    var params = {
        ChangeSetName: changeSetName,
        StackName: stackName
    };
    console.log("Waiting on state: " + waitState + " for ChangeSet: " + changeSetName + ", stack: " + stackName + "...");
    return self.getCloudFormationClient()
        .then(function (cloudFormation) {
            return cloudFormation.waitFor(waitState, params).promise();
        });
}

CloudFormationManager.prototype.waitForChangeSetCreation = function (stackName, changeSetName) {
    var self = this;
    return self.waitFor(stackName, changeSetName, "changeSetCreateComplete");
}

CloudFormationManager.prototype.deleteChangeSet = function (stackName, changeSetName) {
    var self = this;
    var params = {
        ChangeSetName: changeSetName,
        StackName: stackName
    };
    console.log("Deleting ChangeSet: " + changeSetName + " for stack: " + stackName + "...");
    return self.getCloudFormationClient()
        .then(function (cloudformation) {
            return cloudFormation.deleteChangeSet(params).promise();
        });
}

module.exports = CloudFormationManager;

// *** Sample Change-Set Response ***
//
// "ResponseMetadata": {   
//     "RequestId": "10e69670-8c32-11e7-ac5d-5b8b0440122d"
// },
// "ChangeSetName": "create-lambda-stack-change-set-54585",
// "ChangeSetId": "arn:aws:cloudformation:us-east-1:665243897136:changeSet/create-lambda-stack-change-set-54585/e0841bb2-f157-48ac-9fbb-96af03d6f723",
// "StackId": "arn:aws:cloudformation:us-east-1:665243897136:stack/create-lambda-stack/bf802390-8c14-11e7-b836-50a686e4bbe6",
// "StackName": "create-lambda-stack",
// "Parameters": [{
//     "ParameterKey": "environmentName",
//     "ParameterValue": "dev"
// }],
// "CreationTime": "2017-08-28T20:46:41.205Z",
// "ExecutionStatus": "AVAILABLE",
// "Status": "CREATE_COMPLETE",
// "NotificationARNs": [],
// "Capabilities": ["CAPABILITY_IAM"],
// "Tags": [],
// "Changes": [{
//     "Type": "Resource",
//     "ResourceChange": {
//         "Action": "Modify",
//         "LogicalResourceId": "MitelSampleLambdaFunction",
//         "PhysicalResourceId": "dev_MitelSampleLambdaFunction",
//         "ResourceType": "AWS::Lambda::Function",
//         "Replacement": "True",
//         "Scope": ["Properties"],
//         "Details": [{
//             "Target": {
//                 "Attribute": "Properties",
//                 "Name": "FunctionName",
//                 "RequiresRecreation": "Always"
//             },
//             "Evaluation": "Static",
//             "ChangeSource": "DirectModification"
//         }, {
//             "Target": {
//                 "Attribute": "Properties",
//                 "Name": "Timeout",
//                 "RequiresRecreation": "Never"
//             },
//             "Evaluation": "Static",
//             "ChangeSource": "DirectModification"
//         }]
//     }
// }, {
//     "Type": "Resource",
//     "ResourceChange": {
//         "Action": "Add",
//         "LogicalResourceId": "SampleLambdaFunction2",
//         "ResourceType": "AWS::Lambda::Function",
//         "Scope": [],
//         "Details": []
//     }
// }]