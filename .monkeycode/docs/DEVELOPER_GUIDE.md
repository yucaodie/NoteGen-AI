# SupaNoteGen Developer Guide

## 工作区结构

- `apps/web`: Next.js 前端。
- `apps/api`: Node.js API 服务。
- `packages/shared`: 共享类型。
- `supabase/migrations`: 数据库迁移。

## 常用命令

```bash
# 启动前后端开发服务
npm run dev

# 运行全部单元测试
npm test

# 运行前端 UI 回归测试
npm run test:ui
```

## 当前开发约定

- 按 `.monkeycode/specs/supanotegen-original-requirement/tasklist.md` 顺序推进。
- 前端关键点击路径需要保持可执行 UI 回归测试。
- 新增认证相关逻辑优先走 API 层统一封装，再由前端消费。
- 会话恢复失败时优先保持本地缓存可读，避免工作区入口直接中断。
- 内容读写统一经过 API 层 `ContentService`，由服务端执行 owner 校验、软删除过滤和笔记版本递增。
- 工作区前端通过 `apps/web/lib/content.ts` 调用内容 API，并通过 `apps/web/lib/draft-storage.ts` 管理本地草稿。
- 多端增量刷新通过 `apps/api/src/routes/content.ts` 的 `GET /api/v1/sync-events` 和前端游标配合完成。

## 认证实现位置

- API 认证服务: `apps/api/src/auth/service.ts`
- API 认证路由: `apps/api/src/routes/auth.ts`
- API 协作服务: `apps/api/src/collaboration/service.ts`
- API 协作路由: `apps/api/src/routes/collaboration.ts`
- API 内容服务: `apps/api/src/content/service.ts`
- API 内容路由: `apps/api/src/routes/content.ts`
- 前端认证请求: `apps/web/lib/auth.ts`
- 前端内容请求: `apps/web/lib/content.ts`
- 前端草稿缓存: `apps/web/lib/draft-storage.ts`
- 前端同步状态机: `apps/web/lib/sync-service.ts`
- 前端同步存储: `apps/web/lib/sync-storage.ts`
- 前端同步辅助: `apps/web/lib/workspace-sync.ts`
- 前端实时同步订阅: `apps/web/lib/realtime-sync.ts`
- 前端工作区内容辅助: `apps/web/lib/workspace-content.ts`
- 前端本地会话存储: `apps/web/lib/auth-storage.ts`
- 前端恢复策略: `apps/web/lib/workspace-session.ts`

## 测试覆盖

- `apps/api/src/server.test.ts`: 认证接口成功、失败、会话恢复和登出。
- `apps/api/src/server.test.ts`: 还覆盖群组、邀请、接受邀请和共享路由。
- `apps/api/src/collaboration/service.test.ts`: 群组创建、邀请接受、共享创建更新和越权拒绝。
- `apps/api/src/content/service.test.ts`: 知识库树聚合、笔记版本递增和跨用户访问拒绝。
- `apps/api/src/content/service.test.ts`: 还覆盖 sync event 写入和按游标读取。
- `apps/api/src/supabase/migrations.test.ts`: 核心迁移结构与 RLS 关键片段。
- `apps/web/lib/content.test.ts`: 前端内容 API 请求封装与 sync event 游标查询。
- `apps/web/lib/draft-storage.test.ts`: 草稿持久化与清理。
- `apps/web/lib/sync-service.test.ts`: 同步状态机、冲突收敛和重试路径。
- `apps/web/lib/sync-storage.test.ts`: 同步元数据和冲突记录持久化。
- `apps/web/lib/workspace-sync.test.ts`: 同步状态文案和冲突描述辅助。
- `apps/web/lib/realtime-sync.test.ts`: Realtime URL 构造、事件解析和订阅行为。
- `apps/web/lib/workspace-content.test.ts`: 目录筛选、草稿覆盖与树结构更新。
- `apps/web/lib/workspace-session.test.ts`: 会话恢复、会话过期、离线缓存回退。
- `apps/web/tests/ui/home.spec.ts`: 首页关键导航点击路径。
