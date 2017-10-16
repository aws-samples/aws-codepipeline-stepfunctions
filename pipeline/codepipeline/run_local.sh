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

# Example of script calls:
# ------------------------
# ./run_local.sh StateMachineTriggerLambda state_machine_trigger
# ./run_local.sh StateMachineTriggerLambda state_machine_continuation

echo "Running lambda function locally: '$1'..."
sam local invoke "$1" -e "./test_events/event_$2.json" -t codepipeline_template.yaml \
    --env-vars trigger_lambda_env_variables.json
# You can find the state machine ARN as an output parameter of the state machine CloudFormation stack