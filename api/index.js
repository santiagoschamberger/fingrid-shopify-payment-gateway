import { createRequestHandler } from "@remix-run/node";
import * as build from "../build/server/index.js";

// Use Remix Node.js adapter directly instead of @vercel/remix
// This bypasses the problematic @vercel/remix wrapper that loses the routes

const handleRequest = createRequestHandler(build, process.env.NODE_ENV);

export default async function(req, res) {
  try {
    // Convert Node.js request to Web API Request
    const url = `https://${req.headers.host}${req.url}`;
    
    // Handle request body properly for different content types
    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body !== undefined) {
      const contentType = req.headers['content-type'] || '';
      
      if (contentType.includes('application/x-www-form-urlencoded') && typeof req.body === 'object') {
        // Convert parsed form data back to URL-encoded string
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(req.body)) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, String(v)));
          } else if (value !== null && value !== undefined) {
            params.append(key, String(value));
          }
        }
        body = params.toString();
      } else if (typeof req.body === 'string') {
        body = req.body;
      } else if (Buffer.isBuffer(req.body)) {
        body = req.body;
      } else {
        // Fallback: stringify the object
        body = JSON.stringify(req.body);
      }
    }
    
    const request = new Request(url, {
      method: req.method,
      headers: new Headers(req.headers),
      body: body,
    });

    // Get Remix response
    const response = await handleRequest(request);
    
    // Convert Web API Response to Node.js response
    res.statusCode = response.status;
    
    response.headers.forEach((value, name) => {
      res.setHeader(name, value);
    });
    
    if (response.body) {
      const reader = response.body.getReader();
      
      const pump = async () => {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          return;
        }
        res.write(value);
        return pump();
      };
      
      await pump();
    } else {
      res.end();
    }
  } catch (error) {
    console.error('Handler error:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
};