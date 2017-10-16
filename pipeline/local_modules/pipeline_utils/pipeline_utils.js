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
 * 
 * **********************
 * THIRD PARTY COMPONENTS
 * **********************
 * This software includes third party software subject to the following copyrights:
 *
 * https://github.com/stelligent/dromedary-serverless/blob/master/pipeline/lambda/index.js , MIT License
 *
 * The licenses for these third party components are included in LICENSE.txt
 */

var AWS = require('aws-sdk');
var codePipeline = new AWS.CodePipeline();

/********** BEGIN THIRD PARTY COMPONENTS ***********/

var fs = require('fs');
var yauzl = require("yauzl"); // for .zip
var mkdirp = require("mkdirp"); // for .zip
var path = require("path"); // for .zip
var tar = require('tar'); // for .tar.gz
var zlib = require('zlib'); // for .tar.gz
var fstream = require("fstream"); // for .tar.gz
var mime = require('mime'); // for S3 bucket upload
var moment = require('moment'); // for config version
var childProcess = require('child_process'); // for exec
var zipFolder = require('zip-folder');

function Util() { };

var s3 = new AWS.S3({
  maxRetries: 10,
  signatureVersion: "v4"
});

Util.getS3Object = function (params, dest) {
  return new Promise(function (resolve, reject) {
    console.log("Getting S3 Object '" + params.Bucket + "/" + params.Key + "' to '" + dest + "'");
    var file = fs.createWriteStream(dest);
    s3.getObject(params)
      .createReadStream()
      .on('error', reject)
      .pipe(file)
      .on('error', reject)
      .on('close', resolve);
  });
}

Util.uploadToS3 = function (dir, bucket) {
  console.log("Uploading directory '" + dir + "' to '" + bucket + "'");

  var rtn = Promise.resolve(true);
  var files = fs.readdirSync(dir);
  files.forEach(function (file) {
    var path = dir + '/' + file;
    if (!fs.statSync(path).isDirectory()) {
      var params = {
        Bucket: bucket,
        Key: file,
        ACL: 'public-read',
        ContentType: mime.lookup(path),
        CacheControl: 'no-cache, no-store, must-revalidate',
        Expires: 0,
      }

      rtn = rtn.then(function () {
        return Util.putS3Object(params, path);
      })
    }
  });
  return rtn;
}

Util.getCodeRevisionS3Details = function (jobData, artifactName) {
  var artifact = null;
  jobData.inputArtifacts.forEach(function (a) {
    if (a.name == artifactName) {
      artifact = a;
    }
  });

  if (artifact !== null && artifact.location.type == 'S3') {
    var s3Info = {
      Bucket: artifact.location.s3Location.bucketName,
      Key: artifact.location.s3Location.objectKey
    };
    return s3Info;
  }
  throw new Error("Cannot find code revision S3 details for CodePipeline input artifact: " + artifactName);
}

Util.downloadInputArtifact = function (jobData, artifactName, dest) {
  console.log("Downloading input artifact '" + artifactName + "' to '" + dest + "'");
  var s3Details = getCodeRevisionS3Details(jobData, artifactName);
  return Util.getS3Object(s3Details, dest);
}

Util.packTarball = function (sourceDirectory, destPath) {
  return new Promise(function (resolve, reject) {
    console.log("Creating tarball '" + destPath + "' from '" + sourceDirectory + "'");

    var packer = tar.Pack({
      noProprietary: true,
      fromBase: true
    })
      .on('error', reject);

    var gzip = zlib.createGzip()
      .on('error', reject);

    var destFile = fs.createWriteStream(destPath)
      .on('error', reject)
      .on('close', resolve);

    var stream = fstream.Reader({
      path: sourceDirectory,
      type: "Directory"
    })
      .on('error', reject)
      .pipe(packer)
      .pipe(gzip)
      .pipe(destFile);

  });
}

Util.extractTarball = function (sourcePath, destDirectory) {
  return new Promise(function (resolve, reject) {
    console.log("Extracting tarball '" + sourcePath + "' to '" + destDirectory + "'");

    var sourceFile = fs.createReadStream(sourcePath)
      .on('error', reject);

    var gunzip = zlib.createGunzip()
      .on('error', reject);

    var extractor = tar.Extract({
      path: destDirectory
    })
      .on('error', reject)
      .on('end', resolve);

    sourceFile
      .pipe(gunzip)
      .pipe(extractor);
  });
}

Util.rmdir = function (dir) {
  if (!dir || dir == '/') {
    throw new Error('Invalid directory ' + dir);
  }

  console.log("Cleaning directory '" + dir + "'");
  return Util.exec('rm -rf ' + dir);
}

Util.extractZip = function (sourceZip, destDirectory) {
  return new Promise(function (resolve, reject) {
    console.log("Extracting zip: '" + sourceZip + "' to '" + destDirectory + "'");

    yauzl.open(sourceZip, {
      lazyEntries: true
    }, function (err, zipfile) {
      if (err) throw err;
      zipfile.readEntry();
      zipfile.on("error", reject);
      zipfile.on("end", resolve);
      zipfile.on("entry", function (entry) {
        if (/\/$/.test(entry.fileName)) {
          // directory file names end with '/'
          mkdirp(destDirectory + '/' + entry.fileName, function (err) {
            if (err) throw err;
            zipfile.readEntry();
          });
        } else {
          // file entry
          zipfile.openReadStream(entry, function (err, readStream) {
            if (err) throw err;
            // ensure parent directory exists
            mkdirp(destDirectory + '/' + path.dirname(entry.fileName), function (err) {
              if (err) throw err;
              readStream.pipe(fs.createWriteStream(destDirectory + '/' + entry.fileName));
              readStream.on("end", function () {
                zipfile.readEntry();
              });
            });
          });
        }
      });
    });
  });
}

// run shell script
Util.exec = function (command, options) {
  return new Promise(function (resolve, reject) {
    var child = childProcess.exec(command, options);

    var lastMessage = ""
    child.stdout.on('data', function (data) {
      lastMessage = data.toString('utf-8');
      process.stdout.write(data);
    });
    child.stderr.on('data', function (data) {
      lastMessage = data.toString('utf-8');
      process.stderr.write(data);
    });
    child.on('close', function (code) {
      if (!code) {
        resolve(true);
      } else {
        reject("Error(" + code + ") - " + lastMessage);
      }
    });
  });
}

Util.putS3Object = function (params, path) {
  console.log("Putting S3 Object '" + params.Bucket + "/" + params.Key + "' from '" + path + "'");
  params.Body = fs.createReadStream(path);
  return s3.putObject(params).promise();
}

Util.uploadOutputArtifact = function (jobData, artifactName, path) {
  console.log("Uploading output artifact '" + artifactName + "' from '" + path + "'");

  // Get the output artifact
  var artifact = null;
  jobData.outputArtifacts.forEach(function (a) {
    if (a.name == artifactName) {
      artifact = a;
    }
  });

  if (artifact != null && artifact.location.type == 'S3') {
    var params = {
      Bucket: artifact.location.s3Location.bucketName,
      Key: artifact.location.s3Location.objectKey
    };
    return Util.putS3Object(params, path);
  } else {
    return Promise.reject("Unknown Source Type:" + JSON.stringify(sourceOutput));
  }
}

Util.zipDirectory = function (dirToZip, destZipFile) {
  return new Promise(function (resolve, reject) {
    console.log("Zipping directory '" + dirToZip + "' into file: '" + destZipFile + "'");
    zipFolder(dirToZip, destZipFile, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/********** END THIRD PARTY COMPONENTS ***********/

Util.getPipelineExecutionId = function (pipelineName, stageName, actionName, lambdaFunctionName, actionMustBeRunningNow = false) {
  var params = {
    name: pipelineName
  };
  return codePipeline.getPipelineState(params).promise()
    .then(function (response) {
      var stageState = response.stageStates.filter(stage => stage.stageName === stageName);
      if (stageState.length === 0) {
        throw "Could not find pipeline stage: '" + pipelineStage + "' while finding out the pipeline executionId";
      }
      if (actionName !== undefined) {
        var actionState = stageState[0].actionStates.filter(actionState => actionState.actionName === actionName);
        if (actionState.length === 0) {
          throw "Could not find pipeline action: '" + actionName + "' while finding out the pipeline executionId";
        }
        if (lambdaFunctionName !== undefined) {
          if (!actionState[0].entityUrl.endsWith(lambdaFunctionName)) {
            console.log("ActionState: " + JSON.stringify(actionState[0]));
            throw "Found a different entityURL: ('" + actionState[0].entityUrl + "' not ending with the expected function name '" + lambdaFunctionName + "') being called by pipeline action: " + actionName + " while finding out the pipeline executionId";
          }
        }
        if (actionMustBeRunningNow && actionState[0].latestExecution.status !== 'InProgress') {
          throw "Action: '" + actionName + "' is not currently 'InProgress' in the pipeline while finding out the pipeline executionId (latest action state is '" + actionState[0].latestExecution.status + "')";
        }
      }
      return stageState[0].latestExecution.pipelineExecutionId;
      //  return Promise.resolve(stageState[0].latestExecution.pipelineExecutionId);
    });
}

Util.job = function (event) {
  if ("CodePipeline.job" in event == false) {
    throw Error("Event object does not have expected element 'CodePipeline.job'");
  }
  return event['CodePipeline.job'];
}

Util.jobId = function (event) {
  if ("CodePipeline.job" in event == false) {
    throw Error("Event object does not have expected element 'CodePipeline.job'");
  }
  return event['CodePipeline.job'].id;
}

Util.jobData = function (event) {
  if ("CodePipeline.job" in event == false) {
    throw Error("Event object does not have expected element 'CodePipeline.job'");
  }
  return event['CodePipeline.job'].data;
}

Util.continuationToken = function (event) {
  var jobData = Util.jobData(event);
  if ("continuationToken" in jobData == false) {
    throw Error("CodePipeline jobData: " + JSON.stringify(jobData) + " does not have the expected 'continuationToken' element'");
  }
  return jobData.continuationToken;
}

Util.inputArtifact = function (event, artifactName = null) {
  var jobData = Util.jobData(event);
  if (artifactName == null) {
    return jobData.inputArtifacts[0];
  }
  var artifact = null;
  jobData.inputArtifacts.forEach(function (a) {
    if (a.name == artifactName) {
      artifact = a;
    }
  });
  if (artifact == null) {
    throw Error("CodePipeline JobData: " + JSON.stringify(jobData) + "  does not have expected input artifact '" + artifactName + "'");
  }
  return artifact;
}

Util.revisionId = function (event, artifactName = null) {
  var artifact = Util.inputArtifact(event, artifactName);
  if ("revision" in artifact == false) {
    throw Error("Input Artifact object: " + artifact + " does not have expected element 'revision'");
  }
  return artifact.revision;
}

Util.actionUserParameter = function (event, paramName) {
  var jobData = Util.jobData(event);
  if (jobData["actionConfiguration"]["configuration"]["UserParameters"] === undefined) {
    throw Error("CodePipeline JobData does not have 'UserParameters' specified for the action. Expected to find parameter: " + paramName);
  }
  var userParameters = JSON.parse(jobData.actionConfiguration.configuration.UserParameters);
  if (paramName in userParameters == false) {
    throw Error("Cannot find parameter: " + paramName + " in UserParameters: " + JSON.stringify(userParameters));
  }
  return userParameters[paramName];
}

Util.signalPipelineFailure = function (jobId, errorMessage, executionId) {
  console.log("Signaling failure to pipeline for job: " + jobId + ", errorMessage: " + errorMessage + ", executionId: " + executionId);
  var params = {
    jobId: jobId,
    failureDetails: {
      message: JSON.stringify(errorMessage),
      type: 'JobFailed',
      externalExecutionId: executionId
    }
  };
  return codePipeline.putJobFailureResult(params).promise();
};

Util.signalPipelineSuccess = function (jobId) {
  console.log("Signaling completion to pipeline for job: " + jobId);
  var params = {
    jobId: jobId
  };
  return codePipeline.putJobSuccessResult(params).promise();
};

Util.signalPipelineContinuation = function (jobId, continuationToken) {
  console.log("Signaling continuation to pipeline for job: " + jobId + ", continuationToken: " + continuationToken);
  var params = {
    jobId: jobId,
    continuationToken: continuationToken
  };
  return codePipeline.putJobSuccessResult(params).promise();
};

Util.isContinuingPipelineTask = function (event) {
  return (typeof event['CodePipeline.job'].data.continuationToken !== 'undefined');
};

Util.getRandomInt = function (min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

Util.createRandomName = function (prefix, separator = "-", range = 10000) {
  return prefix + separator + Util.getRandomInt(1, range);
}

module.exports = Util;
