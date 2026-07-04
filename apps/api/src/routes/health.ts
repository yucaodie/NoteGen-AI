import type { AppDescriptor } from '@supanotegen/shared';

export function getHealthResponse(): AppDescriptor {
  return {
    name: 'SupaNoteGen API',
    status: 'ok',
    surface: 'api',
  };
}
