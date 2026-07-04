import { createAuthService } from './auth/service';
import { getApiEnv } from './config/env';
import { createLogger } from './lib/logger';
import { createAppServer } from './server';

const env = getApiEnv();
const logger = createLogger();
const authService = createAuthService(env);
const server = createAppServer(logger, authService);

server.listen(env.port, env.host, () => {
  logger.info('API server started', { host: env.host, port: env.port });
});
