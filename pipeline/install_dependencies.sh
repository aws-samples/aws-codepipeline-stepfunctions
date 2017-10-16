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

npm --version
if [ $? != 0 ]; then
  echo "Please install npm: https://www.npmjs.com/get-npm"
  exit 1
fi

echo "installing npm dependencies..."

cd local_modules/pipeline_utils
echo "installing pipeline_utils dependencies..."
./install_modules.sh

cd ..
echo "packing modules..."
./pack_modules.sh

cd ../codepipeline
echo "installing CodePipeline Lambda dependencies"
./install_modules.sh

cd ../statemachines/deploy
echo "installing StateMachine Lambda dependencies"
./install_modules.sh

cd ../..

pwd

echo ""
echo ""
echo "Done - You can now run ./boostrap.sh to deploy the project in your AWS account"
echo ""
echo ""



