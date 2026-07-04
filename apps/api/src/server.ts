import { createServer } from 'node:http';
import { getHealthResponse } from './routes/health';
import type { Logger } from './lib/logger';

export function createAppServer(logger: Logger) {
  return createServer((request, response) => {
    const url = request.url ?? '/';

    if (request.method === 'GET' && (url === '/health' || url === '/api/health')) {
      const body = JSON.stringify(getHealthResponse());
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      response.end(body);
      return;
    }

    logger.error('Route not found', { method: request.method, url });
    response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ message: 'Not Found' }));
  });
}
