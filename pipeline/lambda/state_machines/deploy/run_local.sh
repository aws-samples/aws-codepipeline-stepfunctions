
#!/bin/bash

# Example of script calls:
# ------------------------
# ./run_local.sh CreateStackStateMachineTask create_stack
# ./run_local.sh CheckStackExistsStateMachineTask check_stack_exists
# ./run_local.sh CreateChangeSetStateMachineTask create_change_set
# ./run_local.sh CheckStackCreationStatusStateMachineTask check_stack_creation_status
# ./run_local.sh CheckChangeSetCreationStatusStateMachineTask check_change_set_creation_status
# ./run_local.sh ExecuteChangeSetStateMachineTask execute_change_set
# ./run_local.sh InspectChangeSetStateMachineTask inspect_change_set

echo "Running lambda function locally: '$1'..."
sam local invoke "$1" -e "./test_events/event_$2.json" -t lambda_template.yaml
