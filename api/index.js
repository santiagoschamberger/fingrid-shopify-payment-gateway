import { createRequestHandler } from "@remix-run/vercel";

export default createRequestHandler({
  build: await import("../build/server/index.js"),
});