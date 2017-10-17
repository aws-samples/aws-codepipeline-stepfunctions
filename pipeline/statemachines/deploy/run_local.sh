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
# ./run_local.sh CreateStackStateMachineTask create_stack
# ./run_local.sh CheckStackExistsStateMachineTask check_stack_exists
# ./run_local.sh CreateChangeSetStateMachineTask create_change_set
# ./run_local.sh CreateChangeSetStateMachineTask delete_change_set
# ./run_local.sh CheckStackCreationStatusStateMachineTask check_stack_creation_status
# ./run_local.sh CheckChangeSetCreationStatusStateMachineTask check_change_set_creation_status
# ./run_local.sh ExecuteChangeSetStateMachineTask execute_change_set
# ./run_local.sh InspectChangeSetStateMachineTask inspect_change_set

echo "Running lambda function locally: '$1'..."
sam local invoke "$1" -e "./test_events/event_$2.json" -t state_machine_template.yaml
