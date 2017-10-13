
#!/bin/bash

template="lambda_template.yaml"
stack_name="pipeline-actions-lambda-functions"
s3_bucket="codepipeline-stepfunctions-sample"
output_file="/tmp/output.yaml"

echo "Creating/updating pipeline actions lambda functions..."

sam package --template-file "$template" --s3-bucket "$s3_bucket" --output-template-file "$output_file"
sam deploy --template-file "$output_file" --stack-name "$stack_name" --capabilities CAPABILITY_IAM
