import type { ApiErrorPayload, AuthBootstrap, AuthSession, SignUpResult } from '@supanotegen/shared';
import { getApiUrl } from './api';

type FetchLike = typeof fetch;

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly code: ApiErrorPayload['code'],
  ) {
    super(message);
  }
}

export async function signUp(email: string, password: string, fetchImpl: FetchLike = fetch): Promise<SignUpResult> {
  return postAuth<SignUpResult>('/auth/sign-up', { email, password }, fetchImpl);
}

export async function signIn(email: string, password: string, fetchImpl: FetchLike = fetch): Promise<AuthBootstrap> {
  return postAuth<AuthBootstrap>('/auth/sign-in', { email, password }, fetchImpl);
}

export async function signOut(session: AuthSession, fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl(getApiUrl('/auth/sign-out'), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${session.accessToken}`,
    },
  });

  if (!response.ok) {
    throw await parseApiError(response, '退出登录失败。');
  }
}

export async function recoverSession(session: AuthSession, fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl(getApiUrl('/auth/session'), {
    headers: {
      authorization: `Bearer ${session.accessToken}`,
      'x-refresh-token': session.refreshToken,
    },
  });

  if (!response.ok) {
    throw await parseApiError(response, '会话恢复失败。');
  }

  return (await response.json()) as AuthBootstrap;
}

async function postAuth<T>(
  path: string,
  payload: { email: string; password: string },
  fetchImpl: FetchLike,
): Promise<T> {
  const response = await fetchImpl(getApiUrl(path), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseApiError(response, '认证失败。');
  }

  return (await response.json()) as T;
}

async function parseApiError(response: Response, fallbackMessage: string) {
  try {
    const payload = (await response.json()) as Partial<ApiErrorPayload>;
    return new AuthApiError(payload.message ?? fallbackMessage, payload.code ?? 'auth_failed');
  } catch {
    return new AuthApiError(fallbackMessage, response.status === 401 ? 'session_expired' : 'network_error');
  }
}
