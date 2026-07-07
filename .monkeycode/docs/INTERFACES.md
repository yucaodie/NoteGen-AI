# SupaNoteGen Interfaces

## 已实现 HTTP 接口

### Health

- `GET /health`
- `GET /api/health`

返回值:

```json
{
  "name": "SupaNoteGen API",
  "status": "ok",
  "surface": "api"
}
```

### Auth

- `POST /auth/sign-up`
- `POST /auth/sign-in`
- `POST /auth/sign-out`
- `GET /auth/session`

`POST /auth/sign-up` 和 `POST /auth/sign-in` 请求体:

```json
{
  "email": "user@example.com",
  "password": "password-123"
}
```

成功响应结构:

```json
{
  "session": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresAt": "2026-07-04T05:00:00.000Z",
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    }
  },
  "workspace": {
    "profile": {
      "userId": "uuid",
      "displayName": "user",
      "defaultWorkspaceId": "uuid"
    },
    "knowledgeBases": [],
    "memberships": [],
    "accessContext": {
      "userId": "uuid",
      "groupIds": [],
      "knowledgeBaseIds": []
    },
    "mode": "online"
  }
}
```

错误响应结构:

```json
{
  "code": "auth_failed",
  "message": "Invalid login credentials"
}
```

`GET /auth/session` 需要请求头:

```text
Authorization: Bearer <access-token>
X-Refresh-Token: <refresh-token>
```

### Content

- `GET /api/v1/knowledge-bases`
- `POST /api/v1/knowledge-bases`
- `GET /api/v1/knowledge-bases/:knowledgeBaseId`
- `PATCH /api/v1/knowledge-bases/:knowledgeBaseId`
- `DELETE /api/v1/knowledge-bases/:knowledgeBaseId`
- `POST /api/v1/folders`
- `PATCH /api/v1/folders/:folderId`
- `DELETE /api/v1/folders/:folderId`
- `GET /api/v1/folders/:folderId/notes`
- `POST /api/v1/notes`
- `PATCH /api/v1/notes/:noteId`
- `DELETE /api/v1/notes/:noteId`
- `POST /api/v1/sync-events`
- `GET /api/v1/sync-events?since=<iso>&limit=<n>`

上述接口统一需要请求头:

```text
Authorization: Bearer <access-token>
```

`GET /api/v1/knowledge-bases/:knowledgeBaseId` 返回最小工作区聚合结构:

```json
{
  "knowledgeBase": {
    "id": "kb-1",
    "ownerUserId": "user-1",
    "name": "My Knowledge Base",
    "description": null
  },
  "folders": [
    {
      "id": "folder-1",
      "ownerUserId": "user-1",
      "knowledgeBaseId": "kb-1",
      "parentFolderId": null,
      "title": "Inbox",
      "sortKey": "0001"
    }
  ],
  "notes": [
    {
      "id": "note-1",
      "ownerUserId": "user-1",
      "knowledgeBaseId": "kb-1",
      "folderId": "folder-1",
      "title": "Quick Note",
      "markdownContent": "# Hello",
      "contentHash": "hash",
      "version": 1
    }
  ]
}
```

`GET /api/v1/sync-events` 返回增量同步事件数组:

```json
[
  {
    "id": "event-1",
    "resourceId": "note-1",
    "resourceType": "note",
    "operation": "upsert",
    "localVersion": 3,
    "cloudVersion": 3,
    "status": "synced",
    "payload": {
      "knowledgeBaseId": "kb-1"
    },
    "createdAt": "2026-07-07T16:45:00.000Z"
  }
]
```

## 已实现共享类型

- `KnowledgeBase`
- `UserProfile`
- `GroupMembership`
- `AccessContext`
- `AuthSession`
- `AuthBootstrap`
- `KnowledgeBaseTree`
- `SyncMetadata`
- `SyncEventRecord`

## 前端工作区状态

- `WorkspaceRecoveryState`: 认证恢复、离线只读和未登录三种入口状态。
- 本地草稿缓存键: `supanotegen.workspace.drafts`
- 工作区本地会话缓存键:
  - `supanotegen.auth.session`
  - `supanotegen.workspace.bootstrap`

这些类型定义位于 `packages/shared/src/index.ts`。

## 数据库迁移范围

当前核心迁移文件: `supabase/migrations/20260704041000_bootstrap_core_schema.sql`

已覆盖表:

- `user_profiles`
- `knowledge_bases`
- `folders`
- `notes`
- `groups`
- `group_invitations`
- `group_members`
- `resource_shares`
- `sync_events`
- `embedding_jobs`
- `note_chunks`
- `note_embeddings`
- `api_keys`
