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

    # create state machine lambda function(s)
    . "${base_dir}/statemachines/deploy/deploy.sh"

    # create codepipeline resources
    "${base_dir}/codepipeline/deploy.sh"

}

execute