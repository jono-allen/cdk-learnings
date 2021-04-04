require("dotenv").config();
var shell = require("shelljs");
var { env } = shell;
console.log(`${env["IMAGE_NAME"]}`);
shell.exec(
  `docker build ../ -f ../Dockerfile -t ${env["IMAGE_NAME"]} --no-cache`
);
// env["HASH"] = shell.exec("echo HASH=$(git rev-parse --short HEAD)");
shell.exec(
  `docker tag ${env["IMAGE_NAME"]}:latest ${env["CDK_ACCOUNT"]}.dkr.ecr.ap-southeast-2.amazonaws.com/${env["IMAGE_NAME"]}:latest`
);

shell.exec("$(aws ecr get-login --no-include-email)");

shell.exec(
  `docker push ${env["CDK_ACCOUNT"]}.dkr.ecr.ap-southeast-2.amazonaws.com/${env["IMAGE_NAME"]}:latest`
);
