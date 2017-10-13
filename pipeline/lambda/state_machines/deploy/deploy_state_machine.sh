#!/bin/bash

aws_account_id="665243897136"
aws_region="us-east-1"
state_machine_role_name="StatesExecutionRole-us-east-1"
state_machine_s3_bucket="codepipeline-stepfunctions-sample"

aws s3 cp state_machine_input.json "s3://${state_machine_s3_bucket}"

# if the state machine changes make sure you update the stateMachineArn value under pipeline_actions/lambda_template.yaml
state_machine_name="deploy-sample-lambda-app-state-machine"
state_machine_arn="arn:aws:states:${aws_region}:${aws_account_id}:stateMachine:${state_machine_name}"
state_machine_role_arn="arn:aws:iam::${aws_account_id}:role/service-role/${state_machine_role_name}"
state_machine_definition_file="state_machine_definition.json"

# echo "Creating state machine: ${state_machine_name}..."
aws stepfunctions create-state-machine --name "$state_machine_name" --definition "file://./${state_machine_definition_file}" --role-arn "$state_machine_role_arn"



