
Welcome to the __aws-codepipeline-stepfunctions__ project on AWS Labs! 

How about delegating complex CodePipeline tasks to a proper state machine and keeping your pipeline clean and easy to understand? 

![approach-overview](pipeline/docs/codepipeline_statemachine.png)

This project shows you how to integrate AWS CodePipeline and AWS Step Functions state machines. The integration enables developers to build much simpler CodePipeline actions that perform a single task and to delegate the complexity of dealing with workflow-driven behavior associated with that task to a proper state machine engine. As such, developers will be able to build more intuitive pipelines and still being able to visualize and troubleshoot their pipeline actions in detail by examining the state machine execution logs.

## Project structure

* __app/__ - contains a CloudFormation template that represents the application being deployed via CodePipeline/Step Functions.

* __pipeline/codepipeline__ - CodePipeline resources

* __pipeline/statemachines__ - Step Functions resources including the _Deploy_ state machine

* __pipeline/local_modules__ - required local npm modules

* __pipeline/__docs__ - project's documentation artifacts

## Required Software

Please install the following software in your local workstation before proceeding:

* [Git client](https://git-scm.com/downloads)

* [AWS Command Line Interface](http://docs.aws.amazon.com/cli/latest/userguide/installing.html) (version 1.11.170 or greater)

* Configure your AWS credentials (access keys, AWS region, etc). At a minimum your credentials should allow you to create and manipulate resources associated withe the following AWS services: Amazon S3, AWS CodeCommit, AWS CodePipeline, AWS Lambda, AWS StepFunctions, and AWS IAM.

```bash
aws configure
```

* Install [npm](https://www.npmjs.com/get-npm)

If you plan to develop and contribute to the project it's a good idea to use SAM Local:

* [AWS SAM Local](https://github.com/awslabs/aws-sam-local)

## Instructions

### Make all scripts executable

From the project's root directory, type:

```bash
chmod u+x **/*.sh
```

### Install required NPM modules

From the project's root directory, type:

```bash
  cd pipeline/
  install_dependencies.sh
```

### Deploy Resources

* Clone this project in your local workstation (git clone ...)

* If you wish to use your _default_ AWS profile skip this step, otherwise open script file _config.sh_ and enter your profile using variable _AWS\_PROFILE_.

```bash
vi pipeline/config.sh
```

Important: Make sure the AWS profile chosen uses an AWS region that supports AWS Step Functions [(check here)](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/).

* From the project's root directory run:

```bash
  cd pipeline/
  ./bootstrap.sh
```

The _bootstrap_ script will create all necessary resources including:

* S3 buckets for CodePipeline, Lambda and the State Machine
* Several Lambda functions for CodePipeline and Step Functions 
* The CodeCommit repository
* The Step Functions state machine
* The CodePipeline pipeline

### Push Code and Trigger CodePipeline

Once the bootstrap script completes, open the AWS Console and check the various resources created for you including a CodeCommit repository, a CodePipeline pipeline, a Step Functions state machine, three S3 buckets, and IAM roles. Note that the CodePipeline pipeline is in a failing state since the CodeCommit repository does not have any code. The next step will be to push code to the CodeCommit repository which will cause the pipeline to start processing the changes. 

Let's add code to the repository.

* Using the AWS Console, navigate to the CodeCommit repository created for you

* Click on "Connect" or follow [these instructions](http://docs.aws.amazon.com/codecommit/latest/userguide/how-to-connect.html) to set up credentials to your IAM user to allow you to clone the CodeCommit repository (via SSH or HTTPS). 

* Back in your local workstation. From the project's root directory, type:

```bash
  cd app/
  git init && git add --all
  git commit -m "initial commit"
  git remote add codecommit [YOUR-CODECOMMIT-REPO-CLONE-URL]
  git push codecommit master
```

This will push code into the CodeCommit repository and trigger the CodePipeline pipeline after a few seconds. 

Open the CodePipeline Console and follow the execution of the pipeline. The _Source_ pipeline action will simply load the source code from CodeCommit into an S3 bucket. The _Deploy_ action invokes the _StateMachineTriggerLambda_ Lambda function which, in turn, fetches the state machine input parameters from a file in S3 and triggers the state machine (see figure above for further details). The state machine starts executing while the _StateMachineTriggerLambda_ Lambda sends a continuation token to CodePipeline and terminates. Seconds later, the _StateMachineTriggerLambda_ Lambda is invoked again by CodePipeline. The Lambda will check whether the state machine execution has completed and, if that's the case, it will notify the pipeline that the pipeline action succeeded. If otherwise the state machine has failed, the Lambda will send a failure response to the pipeline action interrupting the pipeline execution. The _StateMachineTriggerLambda_ Lambda fully decouples the pipeline from the state machine.
 
For further details please read our AWS DevOps blog post: [TODO]

## Contributing

Here are a few details you need to know if you wish to contribute to this project.

### Running Locally

Please use [AWS SAM Local](https://github.com/awslabs/aws-sam-local) to run and debug Lambda functions locally. It is really useful and saves a lot of time. A script named _run\_local.sh_ is available under _pipeline/codepipeline_ and _pipeline/statemachine/deploy_ for convenience.

In order to run Lambda functions locally, SAM local requires that test events are passed as input to the Lambda functions. Sample test events are provided under _test\_events_/. Important: the provided test events might contain account-specific parameters that need to be adjusted.

Here is an example of how to invoke the _CreateStackStateMachineTask_ Lambda function:

```bash
  cd pipeline/statemachines/deploy
  ./run_local.sh CreateStackStateMachineTask create_stack
```

Note that template _state\_machine\_template.yaml_ and test event file _test\_events/event\_create\_stack.json_ are referenced within the script.

### Modifying Local Modules

If you plan to make changes to local modules (under _pipeline/local\_modules) keep in mind that this requires updating the modules that depend on these local modules.

This can be accomplished by running these scrips:

```bash
 # pack changes made to local modules
 cd pipeline/local_modules
 ./pack_modules.sh
   
 # update codepipeline local modules references
 cd pipeline/codepipeline
 ./install_modules.sh
   
 # update statemachines/deploy local module references
 cd pipeline/statemachines/deploy
 ./install_modules.sh
```

Have fun and contribute!