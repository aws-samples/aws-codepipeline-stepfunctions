
#!/bin/bash

function execute {
    local base_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    . "${base_dir}/../config.sh"

    local stack_name="${PROJECT_PREFIX}-codepipeline-pipeline"
    local template="${base_dir}/codepipeline_template.yaml"
    local output_file="/tmp/codepipeline-pipeline-output.yaml"

    echo "[== Provisioning CodePipeline resources ==]"
    echo "- stack_name: $stack_name"
    echo "- PIPELINE_LAMBDAS_S3_BUCKET: $PIPELINE_LAMBDAS_S3_BUCKET"
    echo "- CODEPIPELINE_S3_BUCKET: $CODEPIPELINE_S3_BUCKET"
    echo "- template: $template"
    echo "- output_file: $output_file"

    create_bucket_if_it_doesnt_exist $PIPELINE_LAMBDAS_S3_BUCKET $AWS_REGION
    create_bucket_if_it_doesnt_exist $CODEPIPELINE_S3_BUCKET $AWS_REGION true

    aws cloudformation package --template-file "$template" --s3-bucket "$PIPELINE_LAMBDAS_S3_BUCKET" --output-template-file "$output_file"
    aws cloudformation deploy --template-file "$output_file" \
        --stack-name "$stack_name" \
        --parameter-overrides \
            CodePipelineS3Bucket="$CODEPIPELINE_S3_BUCKET"  \
            StateMachineS3Bucket="$STATE_MACHINE_S3_BUCKET" \
            StateMachineStackName="$STATE_MACHINE_STACK_NAME" \
        --capabilities CAPABILITY_IAM
}

execute