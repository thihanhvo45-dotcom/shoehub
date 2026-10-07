import type { Handler } from "aws-lambda";
import serverless from "serverless-http";
import { createApp } from "../../server/app";

const appPromise = createApp();
let wrappedHandler: ReturnType<typeof serverless> | undefined;

export const handler: Handler = async (event, context) => {
  if (!wrappedHandler) wrappedHandler = serverless(await appPromise);
  return wrappedHandler(event, context);
};
