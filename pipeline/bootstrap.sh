#!/bin/bash

set -e

function execute {
    local base_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

    # create state machine lambda function(s)
    . "${base_dir}/statemachines/deploy/deploy.sh"

    # create codepipeline resources
    "${base_dir}/codepipeline/deploy.sh"

}

execute