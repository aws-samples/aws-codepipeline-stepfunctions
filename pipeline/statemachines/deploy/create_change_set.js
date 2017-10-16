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

const Util = require("pipeline_utils");
const CloudFormationManager = require("cloudformation");

// task parameters: environmentName, stackName
function executeTask(event, context) {

    var params = event;
    var artifactExtractPath = '/tmp/sandbox/';
    var artifactZipPath = '/tmp/application_code.zip';
    var stackName = params.environmentName + "-" + params.stackName;
    var cfnManager = new CloudFormationManager();
    var s3Details = {
        Bucket: params.revisionS3Bucket,
        Key: params.revisionS3Key
    };
    return Util.getS3Object(s3Details, artifactZipPath)
        .then(function () {
            return Util.rmdir(artifactExtractPath);
        })
        .then(function () {
            return Util.extractZip(artifactZipPath, artifactExtractPath);
        })
        .then(function () {
            var fs = require("fs");
            var templateBody = fs.readFileSync(artifactExtractPath + params.templatePath, {
                encoding: 'utf8'
            });
            var cnfParams = [
                {
                    ParameterKey: "environmentName",
                    ParameterValue: params.environmentName,
                }
            ];
            var changeSetName = Util.createRandomName(stackName.substring(0, 100) + "-change-set");
            return cfnManager.createChangeSet(stackName, changeSetName, templateBody, cnfParams)
                .then(function (data) {
                    return changeSetName;
                });
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
