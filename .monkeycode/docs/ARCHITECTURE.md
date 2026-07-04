# SupaNoteGen Architecture

## 系统分层

- `apps/web`: Next.js 前端，负责首页、认证页、工作区壳层、浏览器端会话恢复与本地缓存回退。
- `apps/api`: Node.js HTTP 服务，负责健康检查、认证接口和默认工作区初始化。
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

## 关键约束

- 当前 API 仍是轻量 HTTP server，路由通过 `apps/api/src/server.ts` 手工分发。
- 前端工作区仍是壳层页面，知识库 CRUD 和同步逻辑会在后续任务补齐。
- 离线模式当前只覆盖缓存读取与只读提示，真正同步状态机在任务 6 实现。
