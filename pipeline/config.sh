
# Copyright 2012-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
# 
# Licensed under the Amazon Software License (the "License").
# You may not use this file except in compliance with the License.
# A copy of the License is located at
# 
# http://aws.amazon.com/asl/
# 
# or in the "license" file accompanying this file. This file is distributed
# on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
# express or implied. See the License for the specific language governing
# permissions and limitations under the License.

#!/bin/bash
set +e
 
export AWS_PROFILE="default"

root_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
. "${root_dir}/utils.sh"

check_pre_requisites $AWS_PROFILE

export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --output text --query 'Account')
export AWS_REGION=$(aws configure get region --profile $AWS_PROFILE)
export PROJECT_PREFIX="cpsf" # [C]ode [P]ipeline [S]tep [F]unctions
export PIPELINE_LAMBDAS_S3_BUCKET="${PROJECT_PREFIX}-lambda-functions-${AWS_ACCOUNT_ID}-${AWS_REGION}"
export STATE_MACHINE_S3_BUCKET="${PROJECT_PREFIX}-state-machine-input-${AWS_ACCOUNT_ID}-${AWS_REGION}"
export CODEPIPELINE_S3_BUCKET="${PROJECT_PREFIX}-codepipeline-artifacts-${AWS_ACCOUNT_ID}-${AWS_REGION}"
