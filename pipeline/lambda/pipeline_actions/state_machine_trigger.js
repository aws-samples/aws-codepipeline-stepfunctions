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

var AWS = require("aws-sdk");
var Util = require("pipeline_utils");

function getStateMachineInputData(s3Bucket, stateMachinefile) {
    var s3 = new AWS.S3();
    var params = {
        Bucket: s3Bucket,
        Key: stateMachinefile
    };
    return s3.getObject(params).promise();
}

function createStateMachineInitialInput(initialParameters, event) {
    var s3Details = Util.getCodeRevisionS3Details(Util.jobData(event), Util.inputArtifact(event).name);
    var result = JSON.parse(initialParameters);
    result["revisionS3Bucket"] = s3Details.Bucket;
    result["revisionS3Key"] = s3Details.Key;
    console.log("State machine input: " + JSON.stringify(result));
    return result;
}

function getStateMachineExecutionName() {
    return "execution-" + new Date().getTime().toString();
}

function triggerStateMachineExecution(stateMachineArn, inputJSON) {
    var stepFunctions = new AWS.StepFunctions();
    var params = {
        stateMachineArn: stateMachineArn,
        input: JSON.stringify(inputJSON),
        name: getStateMachineExecutionName()
    };
    console.log("Triggering state machine: " + JSON.stringify(params));
    return stepFunctions.startExecution(params).promise();
}

function getStateMachineExecutionStatus(stateMachineExecutionArn) {
    var stepFunctions = new AWS.StepFunctions();
    var params = {
        executionArn: stateMachineExecutionArn
    };
    console.log("Getting state machine execution status: " + JSON.stringify(params));
    return stepFunctions.describeExecution(params).promise();
}

function success(jobId, callback, message) {
    return Util.signalPipelineSuccess(jobId)
        .then(function () {
            console.log(message);
            callback(null, message);
        })
        .catch(function (err) {
            console.log(err.message);
            callback(err.message);
        });
}

function continueExecution(jobId, continuationToken, callback, message) {
    return Util.signalPipelineContinuation(jobId, JSON.stringify(continuationToken))
        .then(function () {
            console.log(message);
            callback(null, message);
        })
        .catch(function (err) {
            console.log(err.message);
            callback(err.message);
        });
}

function failure(jobId, callback, contextId, message) {
    Util.signalPipelineFailure(jobId, message, contextId)
        .then(function () {
            console.log(message);
            // we don't fail the lambda as it did its job
            // also failing the lambda will cause CodePipeline to retry!
            callback(null, message);
        })
        .catch(function (err) {
            console.log(err.message);
            callback(err.message);
        });
}

function monitorStateMachineExecution(event, context, callback) {
    var stateMachineArn = process.env.stateMachineArn;
    var continuationToken = JSON.parse(Util.continuationToken(event));
    var stateMachineExecutionArn = continuationToken.stateMachineExecutionArn;
    getStateMachineExecutionStatus(stateMachineExecutionArn)
        .then(function (response) {
            if (response.status === "RUNNING") {
                var message = "Execution: " + stateMachineExecutionArn + " of state machine: " + stateMachineArn + " is still " + response.status;
                return continueExecution(Util.jobId(event), continuationToken, callback, message);
            }
            if (response.status === "SUCCEEDED") {
                var message = "Execution: " + stateMachineExecutionArn + " of state machine: " + stateMachineArn + " has: " + response.status;
                return success(Util.jobId(event), callback, message);
            }
            // FAILED, TIMED_OUT, ABORTED
            var message = "Execution: " + stateMachineExecutionArn + " of state machine: " + stateMachineArn + " has: " + response.status;
            return failure(Util.jobId(event), callback, context.invokeid, message);
        })
        .catch(function (err) {
            var message = "Error monitoring execution: " + stateMachineExecutionArn + " of state machine: " + stateMachineArn + ", Error: " + err.message;
            failure(Util.jobId(event), callback, context.invokeid, message);
        });
}

function triggerStateMachine(event, context, callback) {
    var stateMachineArn = process.env.stateMachineArn;
    var s3Bucket = Util.actionUserParameter(event, "s3Bucket");
    var stateMachineFile = Util.actionUserParameter(event, "stateMachineFile");
    getStateMachineInputData(s3Bucket, stateMachineFile)
        .then(function (data) {
            var initialParameters = data.Body.toString();
            var stateMachineInputJSON = createStateMachineInitialInput(initialParameters, event);
            console.log("State machine input JSON: " + JSON.stringify(stateMachineInputJSON));
            return stateMachineInputJSON;
        })
        .then(function (stateMachineInputJSON) {
            return triggerStateMachineExecution(stateMachineArn, stateMachineInputJSON);
        })
        .then(function (triggerStateMachineOutput) {
            var continuationToken = { "stateMachineExecutionArn": triggerStateMachineOutput.executionArn };
            var message = "State machine has been triggered: " + JSON.stringify(triggerStateMachineOutput) + ", continuationToken: " + JSON.stringify(continuationToken);
            return continueExecution(Util.jobId(event), continuationToken, callback, message);
        })
        .catch(function (err) {
            console.log("Error triggering state machine: " + stateMachineArn + ", Error: " + err.message);
            failure(Util.jobId(event), callback, context.invokeid, err.message);
        })
}

exports.index = function (event, context, callback) {
    try {
        console.log("Event: " + JSON.stringify(event));
        console.log("Context: " + JSON.stringify(context));
        console.log("Environment Variables: " + JSON.stringify(process.env));
        if (Util.isContinuingPipelineTask(event)) {
            monitorStateMachineExecution(event, context, callback);
        }
        else {
            triggerStateMachine(event, context, callback);
        }
    }
    catch (err) {
        failure(Util.jobId(event), callback, context.invokeid, err.message);
    }
}
