#!/usr/bin/env node
require("dotenv").config();

import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { FargateStack } from "../lib/fargate-stack";
import { EcrStack } from "../lib/ecr-stack";
import { PipelineStack } from "../lib/pipeline-stack";

const stackId = process.env["STACK_ID"] || ("" as string);
const imageName = process.env["IMAGE_NAME"] || ("" as string);

const clusterName = process.env["CLUSTER_NAME"] || ("" as string);
const serviceName = process.env["SERVICE_NAME"] || ("" as string);

const account = process.env["CDK_ACCOUNT"] || ("" as string);
const region = process.env["CDK_REGION"] || ("" as string);

const props = {
  env: { account, region },
} as cdk.StackProps;

const app = new cdk.App();
async function createStacks(): Promise<void> {
  const ecrStack = new EcrStack(app, `${stackId}-ecr`, {
    stack: props,
    imageName,
  });

  new FargateStack(app, `${stackId}-fargate`, {
    env: props.env,
    repository: ecrStack.repository,
    clusterName,
    serviceName,
  });
  new PipelineStack(app, "PipelineStack", {
    env: props.env,
    ecrRepo: ecrStack.repository,
  });
}

createStacks();
