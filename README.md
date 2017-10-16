

Welcome to __aws-codepipeline-stepfunctions__ project! 

This project shows how to integrate AWS CodePipeline and AWS Step Functions state machines. The integration enables developers to build much simpler CodePipeline actions that perform a single task and to delegate the complexity of dealing with workflow-driven behavior associated with that task to a proper state machine engine. As such, developers will be able to build more intuitive pipelines and still being able to visualize and troubleshoot their pipeline actions in detail by examining the state machine execution logs.

## Required Software

Please install the following software before proceeding:

* Install a [Git client](https://git-scm.com/downloads)

* Latest version of the [AWS Command Line Interface](http://docs.aws.amazon.com/cli/latest/userguide/installing.html)

* Configure your AWS credentials: 

```bash
aws configure
```

* Install [npm](https://www.npmjs.com/get-npm)

If you plan to develop and contribute to the project it's a good idea to use SAM Local:

* [AWS SAM Local](https://github.com/awslabs/aws-sam-local)

## Directory structure

* __app/__ - simple Lambda function (src/index.js) and corresponding CloudFormation template (infra/lambda-template.yaml). This code will be pushed into CodeCommit to kick off CodePipeline which then triggers the Step Functions state machine

* __pipeline/codepipeline__ - CodePipeline resources

* __pipeline/statemachines__ - Step Functions resources including the _Deploy_ state machine

* __pipeline/local_modules__ - required local npm modules

## Instructions

### Install required NPM modules

From the project's root directory, type:

```bash
  cd pipeline/
  install_dependencies.sh
```

### Deploy Resources

* Clone this project in your local workstation 

* If you wish to use your _default_ AWS profile skip this step, otherwise open script file _config.sh_ and enter your profile using variable _AWS\_PROFILE_.

```bash
vi pipeline/config.sh
```

Important: Make sure the AWS profile chosen refences an AWS region that supports AWS Step Functions [(check here)](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/).

* From the project's root directory run:

```bash
  cd pipeline/
  ./bootstrap.sh [AWS-PROFILE-NAME]
```

The _Default_ profile will be used if no profile is specified.

The _bootstrap_ script will create all necessary resources including:

* S3 buckets for CodePipeline, Lambda and State Machine
* CodeCommit repository
* Several Lambda functions for CodePipeline and Step Functions 
* The Step Functions state machine
* The CodePipeline pipeline

### Trigger CodePipeline

the __app/__ folder has the CloudFormation template that needs to be pushed into the CodeCommit repository created. This action will kick off the CodePipeline's pipeline.

* Log on the AWS Console using your credentials and navigate to the CodeCommit repository created for you

* Follow [these instructions](http://docs.aws.amazon.com/codecommit/latest/userguide/how-to-connect.html) to retrieve your CodeCommit's SSH or HTTP clone URL.

* From the project's root directory, type:

```bash
  cd app/
  git init && git add --all
  git commit -m "initial commit"
  git remote add codecommit [YOUR-CODECOMMIT-REPO-CLONE-URL]
  git push codecommit master
```

## Running Locally


You can use SAM Local to run the Lambda functions locally. You'll 