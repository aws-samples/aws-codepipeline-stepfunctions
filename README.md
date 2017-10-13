

__Welcome to the AWS Labs' aws-codepipeline-stepfunctions project!__ 

This project exemplifies how to integrate AWS CodePipeline and AWS Step Functions state machines. This integration enables developers to build much simpler CodePipeline actions that perform a single task while delegating the complexity of dealing with workflow-driven behavior associated with that task to a proper state machine engine. As a result, developers build more intuitive pipelines while still being able to visualize and troubleshoot their pipeline actions in detail by examining the state machine execution logs.

## Source Code Directory structure:

 app/ - very simple Lambda function (src/index.js) its corresponding CloudFormation template (infra/lambda-template.yaml)

 pipeline/local_modules/ - local Node modules used by the pipeline and state machine's Lambda functions

 pipeline/lambda/pipeline_actions - the Lambda functions called directly by CodePipeline actions. For now, a single Lambda function is provided that triggers an AWS Step Functions state machine.

 pipeline/lambda/state_machines - the AWS Step Functions state machines. A 'Deploy' state machine is provided consisting of several Lambda functions (called from the state machine's stages). Also, the state machine's definition (JSON) file is provided using the Amazon States Language: https://states-language.net/spec.html.

## Instructions

Follow the steps below to create an AWS CodePipeline pipeline and an AWS StepFunction state machine and have the pipeline Deploy action call the state machine to deploy a sample serverless application (under app/ directory).

You'll need to edit some files to enter account-specific attributes (eg, account id, region, roles, etc).

### Create the AWS StepFunction State Machine

The first step is to create the StepFunction station machine that will provision the infrastructure (CloudFormation) for the sample app.

From the project's root folder:

```bash
  cd pipeline/lambda/state_machines/deploy
  [edit file lambda_template.yaml to reflect your account's environment - eg, IAM roles]
  [edit deploy_lambda.sh to indicate your unique S3 bucket]
  ./deploy_lambda.sh
```

### Create the AWS CodePipeline Pipeline Action Lambdas

From the project's root folder:

```bash
  cd pipeline/lambda/pipeline_actions/
  [edit file lambda_template.yaml to reflect your account's environment - eg, IAM roles, env variables]
  [edit deploy_lambda.sh to indicate your unique S3 bucket]
  ./deploy_lambda.sh
```

### Create an AWS CodeCommit repo

Follow this instructions: http://docs.aws.amazon.com/codecommit/latest/userguide/how-to-create-repository.html 

Once the CodeCommit repo is created push the entire app/ directory as source.

From the project's root folder:

```bash
cd app/
git remote add codecommit https://git-codecommit.[YOUR-REGION].amazonaws.com/v1/repos/[YOUR-CODECOMMIT-REPO]
git push codecommit master
```

### Create a CodePipeline Pipeline

From the project's root folder:

```bash
  cd pipeline/
  [edit file pipeline_description.json to reflect your account's environment - eg, roleArn, CodeCommit repo details, UserParameters, ArtifactStore S3 location, etc]
  ./create_pipeline.sh
```

Once created the pipeline should be triggered automatically.

Changes made to any files under app/ and pushed to the CodeCommit repo will trigger the pipeline again.

## Running Locally

Note that pipeline/lambda/pipeline_actions and pipeline/lambda/state_machines/deploy provide a 'run_local.sh' script and a 'lambda-template.yaml' template that allows you to run the Lambda functions locally using SAM Local: https://github.com/awslabs/aws-sam-local. SAM Local is great for debugging, in isolation, each Lambda function that will be called from the state machine and the state_machine_trigger.js Lambda function that triggers the state machine. SAM Local requires input events that will be used to invoke the Lambda functions, so we provide a couple of sample events under the test_events/ directory. Make sure you use modify the event files as these contain account/environment-specific parameters.

SAM Local invocation example:

Creates a stack based on event file: test_events/event_create_stack.json
 
 ```bash
 cd pipeline/lambda/state_machines/deploy
 ./run_local.sh CreateStackStateMachineTask create_stack
```