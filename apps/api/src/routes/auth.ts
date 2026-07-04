import type { ApiErrorPayload, AuthBootstrap } from '@supanotegen/shared';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuthService } from '../auth/service';

type AuthRouteResult = {
  handled: boolean;
};

type AuthRequestBody = {
  email?: string;
  password?: string;
};

type AuthRouteError = Error & {
  statusCode?: number;
  code?: string;
};

export async function handleAuthRoute(
  request: IncomingMessage,
  response: ServerResponse,
  authService: AuthService,
): Promise<AuthRouteResult> {
  const method = request.method ?? 'GET';
  const url = request.url ?? '/';

  if (method === 'POST' && url === '/auth/sign-up') {
    const body = await readJsonBody(request);
    validateCredentials(body);
    const result = await authService.signUp(body.email!, body.password!);
    sendJson(response, 200, result);
    return { handled: true };
  }

  if (method === 'POST' && url === '/auth/sign-in') {
    const body = await readJsonBody(request);
    validateCredentials(body);
    const result = await authService.signIn(body.email!, body.password!);
    sendJson(response, 200, result);
    return { handled: true };
  }

  if (method === 'POST' && url === '/auth/sign-out') {
    const accessToken = getBearerToken(request);
    if (!accessToken) {
      throw createRouteError(401, 'session_expired', '缺少认证会话。');
    }

    await authService.signOut(accessToken);
    sendJson(response, 200, { signedOut: true });
    return { handled: true };
  }

  if (method === 'GET' && url === '/auth/session') {
    const accessToken = getBearerToken(request);
    if (!accessToken) {
      throw createRouteError(401, 'session_expired', '缺少认证会话。');
    }

    const refreshToken = getHeaderValue(request, 'x-refresh-token');
    const result = await authService.getSession(accessToken, refreshToken);
    sendJson(response, 200, result);
    return { handled: true };
  }

  return { handled: false };
}

export function handleAuthError(response: ServerResponse, error: unknown) {
  const authError = error as AuthRouteError;
  const statusCode = authError.statusCode ?? 500;
  const payload: ApiErrorPayload = {
    code: mapErrorCode(authError.code, statusCode),
    message: authError.message || '认证请求失败。',
  };

  sendJson(response, statusCode, payload);
}

function validateCredentials(body: AuthRequestBody) {
  const email = body.email?.trim();
  const password = body.password?.trim();

  if (!email || !password) {
    throw createRouteError(400, 'invalid_request', '邮箱和密码都是必填项。');
  }
}

function getBearerToken(request: IncomingMessage): string | null {
  const authorizationHeader = getHeaderValue(request, 'authorization');
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.slice('Bearer '.length).trim();
}

function getHeaderValue(request: IncomingMessage, headerName: string): string | undefined {
  const header = request.headers[headerName];
  return Array.isArray(header) ? header[0] : header;
}

function createRouteError(statusCode: number, code: string, message: string): AuthRouteError {
  const error = new Error(message) as AuthRouteError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function mapErrorCode(code: string | undefined, statusCode: number): ApiErrorPayload['code'] {
  if (code === 'invalid_request') {
    return 'invalid_request';
  }

  if (code === 'session_expired') {
    return 'session_expired';
  }

  if (statusCode >= 500) {
    return 'network_error';
  }

  return 'auth_failed';
}

async function readJsonBody(request: IncomingMessage): Promise<AuthRequestBody> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as AuthRequestBody;
}

function sendJson(response: ServerResponse, statusCode: number, body: AuthBootstrap | ApiErrorPayload | { signedOut: boolean }) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}
