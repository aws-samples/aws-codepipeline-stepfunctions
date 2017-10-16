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

set -x

# install external modules
npm install --save aws-sdk fs

# install local modules
local_modules_path="../../local_modules/"
declare -a local_modules=("pipeline_utils" "cloudformation")

for lm in "${local_modules[@]}"
do
    echo "Installing local module: ${lm}"
    npm install --save "${local_modules_path}${lm}.tar.gz"
done
