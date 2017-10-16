
#!/bin/bash

set +e

function error() {
    echo "Error: $1"
    exit -1
}

function check_pre_requisites() {
    local aws_profile=$1
    if ! [ -f ~/.aws/credentials ]; then
        error "Caanot find AWS config file - Please run 'aws configure'."
    fi
    aws configure list --profile $aws_profile > /dev/null 2>&1 < /dev/null
    if [ $? -ne 0 ]; then
        error "Invalid AWS Profile: \"$aws_profile\". Please specify a valid profile."
    fi
}

function create_bucket_if_it_doesnt_exist() {
    local bucket_name=$(echo "$1" | tr "[:upper:]" "[:lower:]")
    local aws_region=$2
    local enable_versioning=${3-false}
    local bucket_status=$(aws s3api head-bucket --bucket "$bucket_name" 2>&1 | grep -o "404\|403")
    # bucket does not exist
    if [[ "$bucket_status" -eq "404" ]]; then
        echo "Creating S3 bucket: $bucket_name"
        aws s3api create-bucket --bucket "$bucket_name" \
            --region "$aws_region" \
            --create-bucket-configuration LocationConstraint="$aws_region"
        if $enable_versioning ; then
           echo "Enabling versioning on S3 bucket: $bucket_name"
           aws s3api put-bucket-versioning --bucket "$bucket_name" \
                --versioning-configuration Status=Enabled
        fi
    # bucket exists, but access denied
    elif [[ "$bucket_status" -eq "403" ]]; then
    echo $?
       error "Access denied to S3 bucket: $bucket_name"
    # bucket exits, access ok - no action
    else
       echo "Reusing S3 bucket: \"$bucket_name\""
    fi
}

export -f error
export -f check_pre_requisites
export -f create_bucket_if_it_doesnt_exist