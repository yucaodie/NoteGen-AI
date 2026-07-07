import { createAuthService } from './auth/service';
import { createCollaborationService } from './collaboration/service';
import { getApiEnv } from './config/env';
import { createContentService } from './content/service';
import { createLogger } from './lib/logger';
import { createAppServer } from './server';

const env = getApiEnv();
const logger = createLogger();
const authService = createAuthService(env);
const contentService = createContentService(env);
const collaborationService = createCollaborationService(env);
const server = createAppServer(logger, authService, contentService, collaborationService);

server.listen(env.port, env.host, () => {
  logger.info('API server started', { host: env.host, port: env.port });
});
