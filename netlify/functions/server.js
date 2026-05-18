// Netlify Function wrapper for TanStack Start SSR server
import { handler as serverHandler } from '../../dist/server/index.js';

export const handler = async (event, context) => {
  // Convert Netlify event to standard Request
  const url = new URL(event.rawUrl);
  const request = new Request(url, {
    method: event.httpMethod,
    headers: new Headers(event.headers),
    body: event.body ? event.body : undefined,
  });

  // Call TanStack Start server handler
  const response = await serverHandler(request);

  // Convert Response to Netlify format
  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    statusCode: response.status,
    headers,
    body: await response.text(),
  };
};
