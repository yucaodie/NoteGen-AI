# SupaNoteGen Project Wiki

## 文档索引

- `ARCHITECTURE.md`: 当前 Web 前端、Node.js API 与 Supabase 的职责分层。
- `INTERFACES.md`: 已实现接口、共享类型和数据库迁移范围。
- `DEVELOPER_GUIDE.md`: 本地开发、测试和当前实施节奏。

## 当前实现状态

- 已完成基础 monorepo、前端首页与工作区壳层、API 健康检查。
- 已完成核心 Supabase schema 与 RLS 迁移脚本。
- 已完成邮箱密码认证接口、会话恢复、默认工作区初始化和离线只读回退。
- 已完成知识库、文件夹和笔记的基础 CRUD API 与内容聚合读取接口。
- 已完成浏览器端知识库树、笔记列表、Markdown 编辑区与本地草稿缓存。
- 当前下一项任务是 SyncService 与多端增量同步流程。
