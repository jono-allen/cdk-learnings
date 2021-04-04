import * as cdk from "@aws-cdk/core";
import * as codebuild from "@aws-cdk/aws-codebuild";
import * as codepipeline from "@aws-cdk/aws-codepipeline";
import * as codepipeline_actions from "@aws-cdk/aws-codepipeline-actions";
import { SecretValue } from "@aws-cdk/core";
import * as ecr from "@aws-cdk/aws-ecr";

interface PipelineProps extends cdk.StackProps {
  readonly ecrRepo: ecr.Repository;
}
const owner = process.env.REPO_OWNER || "";
const repo = process.env.REPO || "";

export class PipelineStack extends cdk.Stack {
  readonly ecrRepo: ecr.Repository;

  constructor(scope: cdk.Construct, id: string, props: PipelineProps) {
    super(scope, id, props);
    this.ecrRepo = props.ecrRepo;
    const cdkBuild = new codebuild.PipelineProject(this, "CdkBuild", {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            commands: "cd deploy && yarn",
          },
          build: {
            commands: ["yarn build", "yarn cdk synth -o dist", "cd .."],
          },
        },
        artifacts: {
          "base-directory": "deploy/dist",
          files: ["fargate-app.template.json"],
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_2_0,
        environmentVariables: {
          CDK_ACCOUNT: {
            type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
            value: "/CodeBuild/CDK_ACCOUNT",
          },
          CDK_REGION: {
            type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
            value: "/CodeBuild/CDK_REGION",
          },
          CLUSTER_NAME: {
            type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
            value: "/CodeBuild/CLUSTER_NAME",
          },
          IMAGE_NAME: {
            type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
            value: "/CodeBuild/IMAGE_NAME",
          },
          STACK_ID: {
            type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
            value: "/CodeBuild/STACK_ID",
          },
        },
      },
    });
    const appBuild = new codebuild.PipelineProject(this, "app-build", {
      buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec.yml"),
      description: "Build Project created by CDK.",
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        privileged: true,
      },
    });
    this.ecrRepo.grantPullPush(appBuild.grantPrincipal);

    // Pipeline
    const sourceOutput = new codepipeline.Artifact();
    const cdkBuildOutput = new codepipeline.Artifact("CdkBuildOutput");
    const appBuildOutput = new codepipeline.Artifact("AppBuildOutput");
    const pipeline = new codepipeline.Pipeline(this, "DeployStackPipeLine", {
      stages: [
        {
          stageName: "Source",
          actions: [
            new codepipeline_actions.GitHubSourceAction({
              actionName: "GitHub",
              output: sourceOutput,
              oauthToken: SecretValue.secretsManager("github-token"),
              trigger: codepipeline_actions.GitHubTrigger.POLL,
              // Replace these with your actual GitHub project info
              owner,
              repo,
              branch: "master",
            }),
          ],
        },
        {
          stageName: "Build",
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: "Build_DockerImage_ECR",
              project: appBuild,
              input: sourceOutput,
              outputs: [appBuildOutput],
            }),
            new codepipeline_actions.CodeBuildAction({
              actionName: "CDK_Build",
              project: cdkBuild,
              input: sourceOutput,
              outputs: [cdkBuildOutput],
            }),
          ],
        },
        {
          stageName: "Deploy",
          actions: [
            new codepipeline_actions.CloudFormationCreateUpdateStackAction({
              actionName: "Fargate_CFN_Deploy",
              templatePath: cdkBuildOutput.atPath("fargate-app.template.json"),
              stackName: "fargate-stack",
              adminPermissions: true,

              extraInputs: [appBuildOutput],
            }),
          ],
        },
      ],
    });
  }
}
