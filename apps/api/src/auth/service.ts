import type {
  AccessContext,
  AuthBootstrap,
  AuthSession,
  AuthUser,
  GroupMembership,
  KnowledgeBase,
  PendingEmailConfirmation,
  SignUpResult,
  UserProfile,
  WorkspaceBootstrap,
} from '@supanotegen/shared';
import type { ApiEnv } from '../config/env';

type FetchLike = typeof fetch;

type SupabaseAuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: {
    display_name?: string | null;
    full_name?: string | null;
  };
};

type SupabaseSessionResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: SupabaseAuthUser;
  error_description?: string;
  msg?: string;
};

type SupabaseAuthError = Error & {
  statusCode?: number;
  code?: string;
};

type UserProfileRow = {
  user_id: string;
  display_name: string;
  default_workspace_id: string | null;
};

type KnowledgeBaseRow = {
  id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
};

type GroupMembershipRow = {
  group_id: string;
  role: 'owner' | 'member';
};

export type AuthService = {
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<AuthBootstrap>;
  signOut: (accessToken: string) => Promise<void>;
  getSession: (accessToken: string, refreshToken?: string) => Promise<AuthBootstrap>;
};

export function createAuthService(env: ApiEnv, fetchImpl: FetchLike = fetch): AuthService {
  const authBaseUrl = new URL('/auth/v1/', env.supabaseUrl).toString();
  const restBaseUrl = new URL('/rest/v1/', env.supabaseUrl).toString();

  async function signUp(email: string, password: string): Promise<SignUpResult> {
    const payload = await authRequest<SupabaseSessionResponse>('signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const session = mapSignUpSession(payload);
    if (!session) {
      return buildPendingEmailConfirmation(payload, email);
    }

    return buildBootstrap(session);
  }

  async function signIn(email: string, password: string): Promise<AuthBootstrap> {
    const payload = await authRequest<SupabaseSessionResponse>('token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const session = mapSession(payload);
    return buildBootstrap(session);
  }

  async function signOut(accessToken: string): Promise<void> {
    await authRequest('logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async function getSession(accessToken: string, refreshToken?: string): Promise<AuthBootstrap> {
    try {
      const user = await getUser(accessToken);
      const session = buildSessionFromToken(accessToken, refreshToken ?? '', user);
      return buildBootstrap(session);
    } catch (error) {
      const authError = error as SupabaseAuthError;
      if (authError.statusCode === 401 && refreshToken) {
        try {
          const refreshed = await refreshSession(refreshToken);
          return buildBootstrap(refreshed);
        } catch (refreshError) {
          const expiredError = refreshError as SupabaseAuthError;
          expiredError.code = 'session_expired';
          expiredError.statusCode = 401;
          throw expiredError;
        }
      }

      if (authError.statusCode === 401) {
        authError.code = 'session_expired';
      }

      throw error;
    }
  }

  async function refreshSession(refreshToken: string): Promise<AuthSession> {
    const payload = await authRequest<SupabaseSessionResponse>('token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    return mapSession(payload);
  }

  async function getUser(accessToken: string): Promise<AuthUser> {
    const response = await fetchImpl(new URL('user', authBaseUrl), {
      headers: {
        apikey: env.supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw await createSupabaseError(response, 'Unable to load user session');
    }

    const payload = (await response.json()) as SupabaseAuthUser;
    return mapUser(payload);
  }

  async function buildBootstrap(session: AuthSession): Promise<AuthBootstrap> {
    const profile = await ensureProfile(session.user);
    const initializedWorkspace = await ensureDefaultWorkspace(session.user, profile);
    const memberships = await getMemberships(session.user.id);
    const workspace = buildWorkspace(
      initializedWorkspace.profile,
      initializedWorkspace.knowledgeBases,
      memberships,
    );

    return {
      session,
      workspace,
    };
  }

  function buildWorkspace(
    profile: UserProfile,
    knowledgeBases: KnowledgeBase[],
    memberships: GroupMembership[],
  ): WorkspaceBootstrap {
    const accessContext: AccessContext = {
      userId: profile.userId,
      groupIds: memberships.map((membership) => membership.groupId),
      knowledgeBaseIds: knowledgeBases.map((knowledgeBase) => knowledgeBase.id),
    };

    return {
      profile,
      knowledgeBases,
      memberships,
      accessContext,
      mode: 'online',
    };
  }

  async function ensureProfile(user: AuthUser): Promise<UserProfile> {
    try {
      const existingRows = await restRequest<UserProfileRow[]>(
        `user_profiles?user_id=eq.${encodeURIComponent(user.id)}&select=user_id,display_name,default_workspace_id`,
        {
          method: 'GET',
        },
      );

      if (existingRows.length > 0) {
        return mapProfile(existingRows[0]);
      }

      const insertedRows = await restRequest<UserProfileRow[]>('user_profiles', {
        method: 'POST',
        headers: {
          Prefer: 'return=representation,resolution=merge-duplicates',
        },
        body: JSON.stringify([
          {
            user_id: user.id,
            display_name: inferDisplayName(user.email),
          },
        ]),
      });

      return mapProfile(insertedRows[0]);
    } catch (error) {
      if (isMissingTableError(error, 'user_profiles')) {
        return createFallbackProfile(user, null);
      }

      throw error;
    }
  }

  async function ensureDefaultWorkspace(
    user: AuthUser,
    profile: UserProfile,
  ): Promise<{ profile: UserProfile; knowledgeBases: KnowledgeBase[] }> {
    let knowledgeBases = await listKnowledgeBases(user.id);
    let nextProfile = profile;

    if (knowledgeBases.length === 0) {
      const createdRows = await restRequest<KnowledgeBaseRow[]>('knowledge_bases', {
        method: 'POST',
        headers: {
          Prefer: 'return=representation',
        },
        body: JSON.stringify([
          {
            owner_user_id: user.id,
            name: 'My Knowledge Base',
            description: 'Default workspace for SupaNoteGen',
          },
        ]),
      });

      knowledgeBases = createdRows.map(mapKnowledgeBase);
      nextProfile = await updateDefaultWorkspace(nextProfile, knowledgeBases[0].id);
    }

    if (!nextProfile.defaultWorkspaceId && knowledgeBases.length > 0) {
      nextProfile = await updateDefaultWorkspace(nextProfile, knowledgeBases[0].id);
    }

    return {
      profile: nextProfile,
      knowledgeBases,
    };
  }

  async function updateDefaultWorkspace(profile: UserProfile, knowledgeBaseId: string): Promise<UserProfile> {
    try {
      const updatedRows = await restRequest<UserProfileRow[]>(
        `user_profiles?user_id=eq.${encodeURIComponent(profile.userId)}&select=user_id,display_name,default_workspace_id`,
        {
          method: 'PATCH',
          headers: {
            Prefer: 'return=representation',
          },
          body: JSON.stringify({ default_workspace_id: knowledgeBaseId }),
        },
      );

      return mapProfile(updatedRows[0]);
    } catch (error) {
      if (isMissingTableError(error, 'user_profiles')) {
        return {
          ...profile,
          defaultWorkspaceId: knowledgeBaseId,
        };
      }

      throw error;
    }
  }

  async function listKnowledgeBases(userId: string): Promise<KnowledgeBase[]> {
    const rows = await restRequest<KnowledgeBaseRow[]>(
      `knowledge_bases?owner_user_id=eq.${encodeURIComponent(userId)}&deleted_at=is.null&select=id,owner_user_id,name,description&order=created_at.asc`,
      {
        method: 'GET',
      },
    );

    return rows.map(mapKnowledgeBase);
  }

  async function getMemberships(userId: string): Promise<GroupMembership[]> {
    const rows = await restRequest<GroupMembershipRow[]>(
      `group_members?user_id=eq.${encodeURIComponent(userId)}&select=group_id,role`,
      {
        method: 'GET',
      },
    );

    return rows.map((row) => ({
      groupId: row.group_id,
      role: row.role,
    }));
  }

  async function authRequest<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetchImpl(new URL(path, authBaseUrl), {
      ...init,
      headers: {
        'content-type': 'application/json',
        apikey: env.supabaseAnonKey,
        ...init.headers,
      },
    });

    if (!response.ok) {
      throw await createSupabaseError(response, 'Authentication request failed');
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  async function restRequest<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetchImpl(new URL(path, restBaseUrl), {
      ...init,
      headers: {
        'content-type': 'application/json',
        apikey: env.supabaseServiceRoleKey,
        Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
        ...init.headers,
      },
    });

    if (!response.ok) {
      throw await createSupabaseError(response, 'Supabase data request failed');
    }

    if (response.status === 204) {
      return [] as T;
    }

    return (await response.json()) as T;
  }

  return {
    signUp,
    signIn,
    signOut,
    getSession,
  };
}

function inferDisplayName(email: string): string {
  const localPart = email.split('@')[0]?.trim();
  return localPart && localPart.length > 0 ? localPart : 'SupaNoteGen User';
}

function createFallbackProfile(user: AuthUser, defaultWorkspaceId: string | null): UserProfile {
  return {
    userId: user.id,
    displayName: inferDisplayName(user.email),
    defaultWorkspaceId,
  };
}

function mapUser(user: SupabaseAuthUser): AuthUser {
  return {
    id: user.id,
    email: user.email ?? '',
  };
}

function mapSession(payload: SupabaseSessionResponse): AuthSession {
  if (!payload.access_token || !payload.refresh_token || !payload.user) {
    const error = new Error(payload.error_description ?? payload.msg ?? 'Session was not created') as SupabaseAuthError;
    error.code = 'auth_failed';
    error.statusCode = 401;
    throw error;
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: new Date(Date.now() + (payload.expires_in ?? 3600) * 1000).toISOString(),
    user: mapUser(payload.user),
  };
}

function mapSignUpSession(payload: SupabaseSessionResponse): AuthSession | null {
  if (payload.access_token && payload.refresh_token && payload.user) {
    return mapSession(payload);
  }

  if (payload.user) {
    return null;
  }

  return mapSession(payload);
}

function buildPendingEmailConfirmation(
  payload: SupabaseSessionResponse,
  fallbackEmail: string,
): PendingEmailConfirmation {
  return {
    status: 'pending_email_confirmation',
    email: payload.user?.email ?? fallbackEmail,
    message: payload.msg ?? '注册成功，请先确认邮箱后再登录。',
  };
}

function buildSessionFromToken(accessToken: string, refreshToken: string, user: AuthUser): AuthSession {
  return {
    accessToken,
    refreshToken,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    user,
  };
}

function mapProfile(row: UserProfileRow): UserProfile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    defaultWorkspaceId: row.default_workspace_id,
  };
}

function mapKnowledgeBase(row: KnowledgeBaseRow): KnowledgeBase {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    description: row.description,
  };
}

async function createSupabaseError(response: Response, fallbackMessage: string): Promise<SupabaseAuthError> {
  let message = fallbackMessage;
  let code = 'auth_failed';

  try {
    const payload = (await response.json()) as {
      msg?: string;
      error_description?: string;
      message?: string;
      code?: string;
    };

    message = payload.error_description ?? payload.message ?? payload.msg ?? fallbackMessage;
    code = payload.code ?? code;
  } catch {
    message = fallbackMessage;
  }

  const error = new Error(message) as SupabaseAuthError;
  error.statusCode = response.status;
  error.code = code;
  return error;
}

function isMissingTableError(error: unknown, tableName: string): boolean {
  const supabaseError = error as SupabaseAuthError;
  return supabaseError.code === 'PGRST205' && supabaseError.message.includes(`public.${tableName}`);
}
