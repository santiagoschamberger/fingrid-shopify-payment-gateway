import { createRequestHandler } from "@vercel/remix";
import * as build from "../build/server/index.js";

console.log("Build object keys:", Object.keys(build));
console.log("Routes type:", typeof build.routes);
console.log("Routes exists:", !!build.routes);

if (build.routes) {
  console.log("Routes keys:", Object.keys(build.routes));
} else {
  console.log("Routes is:", build.routes);
}

export default createRequestHandler({ build });