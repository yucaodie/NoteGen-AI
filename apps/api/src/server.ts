import type { CollaborationService } from './collaboration/service';
import { createServer } from 'node:http';
import type { AuthService } from './auth/service';
import type { ContentService } from './content/service';
import { getHealthResponse } from './routes/health';
import { handleAuthError, handleAuthRoute } from './routes/auth';
import { handleCollaborationError, handleCollaborationRoute } from './routes/collaboration';
import { handleContentError, handleContentRoute } from './routes/content';
import type { Logger } from './lib/logger';

export function createAppServer(
  logger: Logger,
  authService?: AuthService,
  contentService?: ContentService,
  collaborationService?: CollaborationService,
) {
  return createServer(async (request, response) => {
    const url = request.url ?? '/';

    try {
      if (authService) {
        const authResult = await handleAuthRoute(request, response, authService);
        if (authResult.handled) {
          return;
        }
      }

      if (contentService) {
        const contentResult = await handleContentRoute(request, response, contentService);
        if (contentResult.handled) {
          return;
        }
      }

      if (collaborationService) {
        const collaborationResult = await handleCollaborationRoute(request, response, collaborationService);
        if (collaborationResult.handled) {
          return;
        }
      }

      if (request.method === 'GET' && (url === '/health' || url === '/api/health')) {
        const body = JSON.stringify(getHealthResponse());
        response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
        response.end(body);
        return;
      }
    } catch (error) {
      if (url.startsWith('/auth/')) {
        handleAuthError(response, error);
        return;
      }

      if (url.startsWith('/api/v1/')) {
        if (url.startsWith('/api/v1/groups') || url.startsWith('/api/v1/shares')) {
          handleCollaborationError(response, error);
          return;
        }

        handleContentError(response, error);
        return;
      }

      logger.error('Unhandled route failure', { method: request.method, url, error: (error as Error).message });
      response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ message: 'Internal Server Error' }));
      return;
    }

    logger.error('Route not found', { method: request.method, url });
    response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ message: 'Not Found' }));
  });
}
