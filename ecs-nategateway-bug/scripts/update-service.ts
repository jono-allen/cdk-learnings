require("dotenv").config();
var shell = require("shelljs");
var { env } = shell;

shell.exc(
  `aws ecs update-service --service ${env.SERVICE_NAME} --cluster ${env.CLUSTER_NAME} --force-new-deployment`
);
