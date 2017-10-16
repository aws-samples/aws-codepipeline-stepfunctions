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

// task parameters: environmentName, stackName, changeSetName
function executeTask(event, context) {

    var params = event;
    var stackName = params.environmentName + "-" + params.stackName;
    var changeSetName = params.changeSetName;
    var cfnManager = new CloudFormationManager();

    var RESOURCES_BEING_DELETED_OR_REPLACED = "RESOURCES-BEING-DELETED-OR-REPLACED";
    var CAN_SAFELY_UPDATE_EXISTING_STACK = "CAN-SAFELY-UPDATE-EXISTING-STACK";

    function detectChangeSetChanges(changeSetChanges) {
        console.log("Analyzing ChangeSet changes: " + JSON.stringify(changeSetChanges));
        if (changeSetChanges.ExecutionStatus != "AVAILABLE") {
            throw new Error("Expecting ExecutionStatus: 'AVAILABLE' but got: " + changeSetChanges.ExecutionStatus + " when analyzing ChangeSet changes");
        }
        for (var i = 0; i < changeSetChanges.Changes.length; i++) {
            var change = changeSetChanges.Changes[i];
            if (change.Type == "Resource") {
                if (change.ResourceChange.Action == "Delete") {
                    return RESOURCES_BEING_DELETED_OR_REPLACED;
                }
                if (change.ResourceChange.Action == "Modify") {
                    if (change.ResourceChange.Replacement == "True") {
                        return RESOURCES_BEING_DELETED_OR_REPLACED;
                    }
                }
            }
        }
        return CAN_SAFELY_UPDATE_EXISTING_STACK;
    }

    return cfnManager.describeChangeSet(stackName, changeSetName)
        .then(function (changeSetData) {
            console.log("ChangeSet changes: " + JSON.stringify(changeSetData));
            var changeSetAction = detectChangeSetChanges(changeSetData);
            console.log("ChangeSet action: " + changeSetAction);
            return changeSetAction;
        })
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
