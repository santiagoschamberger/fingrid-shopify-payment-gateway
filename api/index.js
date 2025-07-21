import { createRequestHandler } from "@vercel/remix";
import * as build from "../build/server/index.js";

// The issue was that we were passing the build object incorrectly
// @vercel/remix expects the build object with the exact structure from Remix
// No need for async imports or complex validation - just use the direct import

export default createRequestHandler({ 
  build,
  mode: process.env.NODE_ENV 
});