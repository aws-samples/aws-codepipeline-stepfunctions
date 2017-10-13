#!/bin/bash

echo "Creating pipeline..."
aws codepipeline create-pipeline --cli-input-json file://pipeline_description.json