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

set -e 

function execute {
    local base_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    . "${base_dir}/../../config.sh"

    local stack_name="${PROJECT_PREFIX}-state-machine"
    local template="${base_dir}/state_machine_template.yaml"
    local output_file="/tmp/state_machine_template-output.yaml"
    local state_machine_input_file="${base_dir}/state_machine_input.json"

    export STATE_MACHINE_STACK_NAME=$stack_name

    echo $'\n[== Provisioning Step Functions state machine resources ==]'
    echo "- stack_name: $stack_name"
    echo "- STATE_MACHINE_S3_BUCKET: $STATE_MACHINE_S3_BUCKET"
    echo "- template: $template"
    echo "- output_file: $output_file"

    create_bucket_if_it_doesnt_exist $STATE_MACHINE_S3_BUCKET $AWS_REGION
    echo "Copying state machine input parameters file \"state_machine_input_file\" to S3 bucket: $STATE_MACHINE_S3_BUCKET"
    aws s3 cp "$state_machine_input_file" "s3://$STATE_MACHINE_S3_BUCKET"

    aws cloudformation package --template-file "$template" --s3-bucket "$STATE_MACHINE_S3_BUCKET" --output-template-file "$output_file"
    aws cloudformation deploy --template-file "$output_file" --stack-name "$stack_name" --capabilities CAPABILITY_IAM
}

execute