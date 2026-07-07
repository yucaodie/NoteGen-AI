import type { ApiErrorPayload, Folder, KnowledgeBase, KnowledgeBaseTree, Note, SyncEventRecord } from '@supanotegen/shared';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ContentService } from '../content/service';

type ContentRouteResult = {
  handled: boolean;
};

type ContentRouteError = Error & {
  statusCode?: number;
  code?: string;
  cloudVersion?: number;
  cloudContentHash?: string;
};

export async function handleContentRoute(
  request: IncomingMessage,
  response: ServerResponse,
  contentService: ContentService,
): Promise<ContentRouteResult> {
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? '/', 'http://localhost');
  const pathname = url.pathname;
  const accessToken = getBearerToken(request);

  if (pathname.startsWith('/api/v1/') && !accessToken) {
    throw createRouteError(401, 'session_expired', '缺少认证会话。');
  }

  if (method === 'GET' && pathname === '/api/v1/knowledge-bases') {
    sendJson(response, 200, await contentService.listKnowledgeBases(accessToken!));
    return { handled: true };
  }

  if (method === 'POST' && pathname === '/api/v1/knowledge-bases') {
    const body = await readJsonBody(request);
    sendJson(response, 200, await contentService.createKnowledgeBase(accessToken!, body as never));
    return { handled: true };
  }

  const knowledgeBaseMatch = pathname.match(/^\/api\/v1\/knowledge-bases\/([^/]+)$/);
  if (knowledgeBaseMatch) {
    const knowledgeBaseId = decodeURIComponent(knowledgeBaseMatch[1]!);
    if (method === 'GET') {
      sendJson(response, 200, await contentService.getKnowledgeBaseTree(accessToken!, knowledgeBaseId));
      return { handled: true };
    }
    if (method === 'PATCH') {
      const body = await readJsonBody(request);
      sendJson(response, 200, await contentService.updateKnowledgeBase(accessToken!, knowledgeBaseId, body));
      return { handled: true };
    }
    if (method === 'DELETE') {
      await contentService.deleteKnowledgeBase(accessToken!, knowledgeBaseId);
      sendJson(response, 200, { deleted: true });
      return { handled: true };
    }
  }

  if (method === 'POST' && pathname === '/api/v1/folders') {
    const body = await readJsonBody(request);
    sendJson(response, 200, await contentService.createFolder(accessToken!, body as never));
    return { handled: true };
  }

  const folderMatch = pathname.match(/^\/api\/v1\/folders\/([^/]+)$/);
  if (folderMatch) {
    const folderId = decodeURIComponent(folderMatch[1]!);
    if (method === 'PATCH') {
      const body = await readJsonBody(request);
      sendJson(response, 200, await contentService.updateFolder(accessToken!, folderId, body));
      return { handled: true };
    }
    if (method === 'DELETE') {
      await contentService.deleteFolder(accessToken!, folderId);
      sendJson(response, 200, { deleted: true });
      return { handled: true };
    }
  }

  const folderNotesMatch = pathname.match(/^\/api\/v1\/folders\/([^/]+)\/notes$/);
  if (folderNotesMatch && method === 'GET') {
    const folderId = decodeURIComponent(folderNotesMatch[1]!);
    sendJson(response, 200, await contentService.listFolderNotes(accessToken!, folderId));
    return { handled: true };
  }

  if (method === 'POST' && pathname === '/api/v1/notes') {
    const body = await readJsonBody(request);
    sendJson(response, 200, await contentService.createNote(accessToken!, body as never));
    return { handled: true };
  }

  if (method === 'POST' && pathname === '/api/v1/sync-events') {
    const body = await readJsonBody(request);
    await contentService.createSyncEvent(accessToken!, body as never);
    sendJson(response, 200, { recorded: true });
    return { handled: true };
  }

  if (method === 'GET' && pathname === '/api/v1/sync-events') {
    sendJson(
      response,
      200,
      await contentService.listSyncEvents(accessToken!, {
        since: url.searchParams.get('since') ?? undefined,
        limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
      }),
    );
    return { handled: true };
  }

  const noteMatch = pathname.match(/^\/api\/v1\/notes\/([^/]+)$/);
  if (noteMatch) {
    const noteId = decodeURIComponent(noteMatch[1]!);
    if (method === 'PATCH') {
      const body = await readJsonBody(request);
      sendJson(response, 200, await contentService.updateNote(accessToken!, noteId, body));
      return { handled: true };
    }
    if (method === 'DELETE') {
      await contentService.deleteNote(accessToken!, noteId);
      sendJson(response, 200, { deleted: true });
      return { handled: true };
    }
  }

  return { handled: false };
}

export function handleContentError(response: ServerResponse, error: unknown) {
  const contentError = error as ContentRouteError;
  const statusCode = contentError.statusCode ?? 500;
  const payload: ApiErrorPayload & { cloudVersion?: number; cloudContentHash?: string } = {
    code: mapErrorCode(contentError.code, statusCode),
    message: contentError.message || '内容请求失败。',
  };

  if (contentError.cloudVersion !== undefined) {
    payload.cloudVersion = contentError.cloudVersion;
  }

  if (contentError.cloudContentHash) {
    payload.cloudContentHash = contentError.cloudContentHash;
  }

  sendJson(response, statusCode, payload);
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

function createRouteError(statusCode: number, code: string, message: string): ContentRouteError {
  const error = new Error(message) as ContentRouteError;
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

async function readJsonBody(request: IncomingMessage): Promise<Record<string, any>> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, any>;
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body:
    | KnowledgeBase[]
    | KnowledgeBase
    | KnowledgeBaseTree
    | Folder
    | Note[]
    | Note
    | SyncEventRecord[]
    | ApiErrorPayload
    | { deleted: boolean }
    | { recorded: boolean },
) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}
