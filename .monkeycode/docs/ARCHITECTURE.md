# SupaNoteGen Architecture

## 系统分层

- `apps/web`: Next.js 前端，负责首页、认证页、工作区、浏览器端会话恢复、本地草稿缓存与离线只读回退。
- `apps/api`: Node.js HTTP 服务，负责健康检查、认证接口、默认工作区初始化和内容 CRUD API。
- `supabase/migrations`: 数据库 schema、RLS policy 和权限辅助函数。
- `packages/shared`: 前后端共享领域类型，包括知识库、认证会话、工作区引导数据和访问上下文。

## 当前认证闭环

- 前端通过 `/auth/sign-up` 和 `/auth/sign-in` 发起邮箱密码认证。
- API 服务转调 Supabase Auth REST 接口创建或恢复会话。
- API 服务使用 service role 调用 PostgREST，确保 `user_profiles` 存在，并在首登时创建默认 `knowledge_bases` 记录。
- 前端把 `session` 与 `workspace bootstrap` 存入浏览器本地存储。
- 进入工作区时，前端调用 `/auth/session` 校验 access token，并在 access token 失效时用 refresh token 触发服务端刷新。
- 会话恢复失败且存在本地缓存时，前端进入 `offline-readonly` 模式。

## 数据职责

- Supabase Auth: 用户注册、登录、登出、令牌刷新与当前用户识别。
- Supabase PostgREST: `user_profiles`、`knowledge_bases`、`group_members` 等业务数据初始化与读取。
- Supabase RLS: 私有资源访问约束、共享资源读写约束、后续 RAG 过滤基础。

## 当前内容 API

- `ContentService` 负责知识库、文件夹、笔记的增删改查，并在 API 层统一执行 owner 校验。
- 知识库详情接口返回 `knowledgeBase + folders + notes` 的最小聚合结构，供后续前端树状工作区直接消费。
- 软删除通过写入 `deleted_at` 实现，查询路径统一过滤 `deleted_at is null`。
- 笔记更新时由 API 层统一递增 `version` 并刷新 `content_hash`，为后续同步状态机打基础。
- `sync_events` 已提供写入和按游标拉取能力，前端可基于 `since` 做增量刷新判断。

## 当前工作区前端

- 工作区页面已经接入真实内容 API，支持知识库切换、文件夹筛选、笔记创建和 Markdown 保存。
- 编辑器会为当前笔记保留本地草稿，刷新页面后优先用本地草稿覆盖云端内容显示。
- 离线只读模式下继续展示缓存工作区，并保留本地草稿内容用于后续恢复。
- 页面重新可见时，前端会先请求 `/api/v1/sync-events` 检查当前知识库是否有增量变更，再决定是否刷新整棵树。
- 网络恢复时，前端会自动重试本地待同步队列，并保留冲突记录用于后续人工决议。
- 浏览器会直接订阅 Supabase Realtime `public.sync_events`，当前知识库收到远端事件后立即刷新本地树状态。
- 当前选中冲突笔记已支持两种动作：采用云端版本，或基于最新云端版本重新提交本地内容。

## 关键约束

- 当前 API 仍是轻量 HTTP server，路由通过 `apps/api/src/server.ts` 手工分发。
- 当前工作区已经具备最小可用的树状浏览、编辑、增量同步检测、Realtime 自动刷新和基础冲突决议能力。
