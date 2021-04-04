require("dotenv").config();
var shell = require("shelljs");
var { env } = shell;

shell.exec(
  `cdk -a "ts-node --dir ./bin/cloudformation.ts" --require-approval=never deploy ${env.STACK_ID}-ecr`
);
