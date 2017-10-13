/*
 * Copyright 2012-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

const CloudFormationManager = require("cloudformation");

// task parameters: environmentName, stackName
function executeTask(event, context) {

    var params = event;
    var stackName = params.environmentName + "-" + params.stackName;
    var cfnManager = new CloudFormationManager();

    return cfnManager.hasStackCreationCompleted(stackName)
        .then(function (creationCompleteFlag) {
            var status = (creationCompleteFlag ? "complete" : "in_progress");
            return status;
        });
}

exports.handler = function (event, context, callback) {

    executeTask(event, context)
        .then(function (response) {
            callback(null, response);
        })
        .catch(function (err) {
            console.log("Error running lambda function: " + err.message);
            callback(err);
        });

}
