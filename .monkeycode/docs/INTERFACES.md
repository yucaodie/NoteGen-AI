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

## 已实现共享类型

- `KnowledgeBase`
- `UserProfile`
- `GroupMembership`
- `AccessContext`
- `AuthSession`
- `AuthBootstrap`
- `SyncMetadata`

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
