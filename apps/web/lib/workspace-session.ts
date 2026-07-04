import type { AuthBootstrap, AuthSession } from '@supanotegen/shared';
import { AuthApiError } from './auth';

export type WorkspaceRecoveryState =
  | {
      kind: 'authenticated';
      bootstrap: AuthBootstrap;
      message: string;
    }
  | {
      kind: 'offline-readonly';
      bootstrap: AuthBootstrap;
      message: string;
    }
  | {
      kind: 'unauthenticated';
      message: string;
    };

export async function recoverWorkspaceSessionState(options: {
  session: AuthSession | null;
  cachedBootstrap: AuthBootstrap | null;
  recoverOnline: (session: AuthSession) => Promise<AuthBootstrap>;
  persistBootstrap: (bootstrap: AuthBootstrap) => void;
  clearSession: () => void;
}): Promise<WorkspaceRecoveryState> {
  const { session, cachedBootstrap, recoverOnline, persistBootstrap, clearSession } = options;

  if (!session) {
    return {
      kind: 'unauthenticated',
      message: '请先登录后再进入云端工作区。',
    };
  }

  try {
    const bootstrap = await recoverOnline(session);
    persistBootstrap(bootstrap);
    return {
      kind: 'authenticated',
      bootstrap,
      message: '云端工作区已恢复。',
    };
  } catch (error) {
    if (error instanceof AuthApiError && error.code === 'session_expired') {
      clearSession();

      if (cachedBootstrap) {
        return {
          kind: 'offline-readonly',
          bootstrap: {
            ...cachedBootstrap,
            workspace: {
              ...cachedBootstrap.workspace,
              mode: 'offline-readonly',
            },
          },
          message: '会话已过期，当前进入离线只读模式。',
        };
      }

      return {
        kind: 'unauthenticated',
        message: '会话已过期，请重新登录。',
      };
    }

    if (cachedBootstrap) {
      return {
        kind: 'offline-readonly',
        bootstrap: {
          ...cachedBootstrap,
          workspace: {
            ...cachedBootstrap.workspace,
            mode: 'offline-readonly',
          },
        },
        message: '网络暂时不可用，当前展示本地缓存的只读工作区。',
      };
    }

    return {
      kind: 'unauthenticated',
      message: '无法恢复会话，请稍后再试。',
    };
  }
}
