import {
  expect as expectCDK,
  matchTemplate,
  MatchStyle,
} from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import * as FargateStack from "../lib/fargate-stack";
import { EcrStack } from "../lib/ecr-stack";

test("Empty Stack", () => {
  const app = new cdk.App();
  // WHEN
  const ecrStack = new EcrStack(app, `ecr`, {
    imageName: "MyImage",
  });

  const stack = new FargateStack.FargateStack(app, "MyTestStack", {
    clusterName: "MyCluster",
    serviceName: "MyService",
    repository: ecrStack.repository,
  });
  // THEN
  expectCDK(stack).to(
    matchTemplate(
      {
        Resources: {},
      },
      MatchStyle.EXACT
    )
  );
});
