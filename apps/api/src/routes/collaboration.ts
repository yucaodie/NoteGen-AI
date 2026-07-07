import type { ApiErrorPayload, Group, GroupInvitation, GroupMembership, ResourceShare } from '@supanotegen/shared';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CollaborationService } from '../collaboration/service';

type CollaborationRouteResult = {
  handled: boolean;
};

type CollaborationRouteError = Error & {
  statusCode?: number;
  code?: string;
};

export async function handleCollaborationRoute(
  request: IncomingMessage,
  response: ServerResponse,
  collaborationService: CollaborationService,
): Promise<CollaborationRouteResult> {
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? '/', 'http://localhost');
  const pathname = url.pathname;
  const accessToken = getBearerToken(request);

  if ((pathname.startsWith('/api/v1/groups') || pathname.startsWith('/api/v1/shares')) && !accessToken) {
    throw createRouteError(401, 'session_expired', '缺少认证会话。');
  }

  if (method === 'POST' && pathname === '/api/v1/groups') {
    const body = await readJsonBody(request);
    sendJson(response, 200, await collaborationService.createGroup(accessToken!, body as never));
    return { handled: true };
  }

  const groupInvitationMatch = pathname.match(/^\/api\/v1\/groups\/([^/]+)\/invitations$/);
  if (groupInvitationMatch && method === 'POST') {
    const body = await readJsonBody(request);
    sendJson(
      response,
      200,
      await collaborationService.createGroupInvitation(accessToken!, decodeURIComponent(groupInvitationMatch[1]!), body as never),
    );
    return { handled: true };
  }

  const acceptInvitationMatch = pathname.match(/^\/api\/v1\/groups\/invitations\/([^/]+)\/accept$/);
  if (acceptInvitationMatch && method === 'POST') {
    sendJson(
      response,
      200,
      await collaborationService.acceptGroupInvitation(accessToken!, decodeURIComponent(acceptInvitationMatch[1]!)),
    );
    return { handled: true };
  }

  if (method === 'POST' && pathname === '/api/v1/shares') {
    const body = await readJsonBody(request);
    sendJson(response, 200, await collaborationService.createResourceShare(accessToken!, body as never));
    return { handled: true };
  }

  const shareMatch = pathname.match(/^\/api\/v1\/shares\/([^/]+)$/);
  if (shareMatch && method === 'PATCH') {
    const body = await readJsonBody(request);
    sendJson(
      response,
      200,
      await collaborationService.updateResourceShare(accessToken!, decodeURIComponent(shareMatch[1]!), body as never),
    );
    return { handled: true };
  }

  return { handled: false };
}

export function handleCollaborationError(response: ServerResponse, error: unknown) {
  const collaborationError = error as CollaborationRouteError;
  sendJson(response, collaborationError.statusCode ?? 500, {
    code: mapErrorCode(collaborationError.code, collaborationError.statusCode ?? 500),
    message: collaborationError.message || '协作请求失败。',
  });
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

function createRouteError(statusCode: number, code: string, message: string): CollaborationRouteError {
  const error = new Error(message) as CollaborationRouteError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function mapErrorCode(code: string | undefined, statusCode: number): ApiErrorPayload['code'] {
  if (code === 'invalid_request' || code === 'session_expired' || code === 'forbidden' || code === 'not_found' || code === 'conflict') {
    return code;
  }

  if (statusCode >= 500) {
    return 'network_error';
  }

  return 'auth_failed';
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: Group | GroupInvitation | GroupMembership | ResourceShare | ApiErrorPayload,
) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}
