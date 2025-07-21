import { createRequestHandler } from "@vercel/remix";
import * as build from "../build/server/index.js";

console.log("Checking each route for issues:");
Object.entries(build.routes).forEach(([key, route]) => {
  console.log(`Route ${key}:`, {
    id: route?.id,
    parentId: route?.parentId,
    path: route?.path,
    index: route?.index,
    module: !!route?.module
  });
  if (!route || typeof route !== 'object') {
    console.log(`ERROR: Route ${key} is invalid:`, route);
  }
});

export default createRequestHandler({ build });