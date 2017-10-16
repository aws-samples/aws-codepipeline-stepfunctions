
#!/bin/bash

# Example of script calls:
# ------------------------
# ./run_local.sh StateMachineTriggerLambda state_machine_trigger
# ./run_local.sh StateMachineTriggerLambda state_machine_continuation

echo "Running lambda function locally: '$1'..."
sam local invoke "$1" -e "./test_events/event_$2.json" -t codepipeline_template.yaml \
    --env-vars trigger_lambda_env_variables.json
# You can find the state machine ARN as an output parameter of the state machine CloudFormation stack