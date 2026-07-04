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

## 认证实现位置

- API 认证服务: `apps/api/src/auth/service.ts`
- API 认证路由: `apps/api/src/routes/auth.ts`
- 前端认证请求: `apps/web/lib/auth.ts`
- 前端本地会话存储: `apps/web/lib/auth-storage.ts`
- 前端恢复策略: `apps/web/lib/workspace-session.ts`

## 测试覆盖

- `apps/api/src/server.test.ts`: 认证接口成功、失败、会话恢复和登出。
- `apps/api/src/supabase/migrations.test.ts`: 核心迁移结构与 RLS 关键片段。
- `apps/web/lib/workspace-session.test.ts`: 会话恢复、会话过期、离线缓存回退。
- `apps/web/tests/ui/home.spec.ts`: 首页关键导航点击路径。
