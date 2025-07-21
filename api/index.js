import { createRequestHandler } from "@vercel/remix";

let build;
let buildError;

try {
  build = await import("../build/server/index.js");
  console.log("Build imported successfully:");
  console.log("- Routes:", Object.keys(build.routes || {}));
  console.log("- Routes type:", typeof build.routes);
  
  // Check if routes object is valid
  if (!build.routes || typeof build.routes !== 'object') {
    throw new Error(`Invalid routes object: ${typeof build.routes}`);
  }
  
  // Check each route for validity
  for (const [key, route] of Object.entries(build.routes)) {
    if (!route || typeof route !== 'object') {
      throw new Error(`Invalid route '${key}': ${typeof route}`);
    }
    if (!route.id) {
      throw new Error(`Route '${key}' missing id property`);
    }
  }
  
} catch (error) {
  buildError = error;
  console.error("Failed to import or validate build:", error);
  console.error("Error stack:", error.stack);
}

if (buildError) {
  export default function(req, res) {
    console.error("Build error, returning 500:", buildError.message);
    res.status(500).json({ 
      error: "Build import failed", 
      message: buildError.message,
      stack: buildError.stack 
    });
  };
} else {
  export default createRequestHandler({ build });
}