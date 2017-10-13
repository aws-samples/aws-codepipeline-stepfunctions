#!/bin/bash

set -x

# install external modules
npm install --save aws-sdk fs

# install local modules
local_modules_path="../../../local_modules/"
declare -a local_modules=("pipeline_utils" "cloudformation")

for lm in "${local_modules[@]}"
do
    echo "Installing local module: ${lm}"
    npm install --save "${local_modules_path}${lm}.tar.gz"
done
