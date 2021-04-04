import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecs_patterns from "@aws-cdk/aws-ecs-patterns/";
import * as ssm from "@aws-cdk/aws-ssm";
import * as elbv2 from "@aws-cdk/aws-elasticloadbalancingv2";
import { Certificate } from "@aws-cdk/aws-certificatemanager";
import { HostedZone } from "@aws-cdk/aws-route53";
import { IRepository } from "@aws-cdk/aws-ecr";
import { EcrImage } from "@aws-cdk/aws-ecs";

interface Props extends cdk.StackProps {
  repository: IRepository;
  clusterName: string;
  serviceName: string;
}

const certArn = process.env.CERT_ARN || "";
const zoneName = process.env.DOMAIN || "";
const hostedZoneId = process.env.HOSTED_ZONE_ID || "";

export class FargateStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: Props) {
    super(scope, id, props);
    const vpc = new ec2.Vpc(this, `${id}-vpc`, {
      maxAzs: 3, // Default is all AZs in region (i think this line might have something to do with it)
    });

    const cluster = new ecs.Cluster(this, props.clusterName, {
      vpc: vpc,
    });
    const NEXT_PUBLIC_GRAPHQL_ENDPOINT = ssm.StringParameter.valueForStringParameter(
      this,
      "NEXT_PUBLIC_GRAPHQL_ENDPOINT"
    );

    const DATABASE_URL = ssm.StringParameter.valueForStringParameter(
      this,
      "DATABASE_URL"
    );
    const NEXT_PUBLIC_MAPS_KEY = ssm.StringParameter.valueForStringParameter(
      this,
      "NEXT_PUBLIC_MAPS_KEY"
    );
    const GITHUB_ID = ssm.StringParameter.valueForStringParameter(
      this,
      "GITHUB_ID"
    );
    const GITHUB_SECRET = ssm.StringParameter.valueForStringParameter(
      this,
      "GITHUB_SECRET"
    );
    const NEXTAUTH_URL = ssm.StringParameter.valueForStringParameter(
      this,
      "NEXTAUTH_URL"
    );

    const certificate = Certificate.fromCertificateArn(
      this,
      "ssl-certificate",
      certArn
    );
    const zone = HostedZone.fromHostedZoneAttributes(this, "hosted-zone", {
      hostedZoneId,
      zoneName,
    });
    const image = EcrImage.fromEcrRepository(props.repository, "latest");

    // Create a load-balanced Fargate service and make it public
    new ecs_patterns.ApplicationLoadBalancedFargateService(this, `${id}-app`, {
      cluster: cluster, // Required
      cpu: 256, // Default is 256
      desiredCount: 1, // Default is 1
      protocol: elbv2.ApplicationProtocol.HTTPS,
      redirectHTTP: true,
      domainZone: zone,
      domainName: "www",
      certificate,
      taskImageOptions: {
        containerPort: 80,
        environment: {
          NEXT_PUBLIC_GRAPHQL_ENDPOINT,
          DATABASE_URL,
          NEXT_PUBLIC_MAPS_KEY,
          GITHUB_ID,
          GITHUB_SECRET,
          NEXTAUTH_URL,
          NEXT_PORT: "80",
        },
        image: image,
      },
      memoryLimitMiB: 512, // Default is 512
      publicLoadBalancer: true, // Default is false
    });
  }
}
