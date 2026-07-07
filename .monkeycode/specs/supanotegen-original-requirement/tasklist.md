# 需求实施计划

- [x] 1. 搭建 Web 前端、独立 API 服务与 Supabase 基础工程
  - 创建前端应用、后端 API 服务和共享类型包的目录结构，对应设计中的 `Next.js Frontend`、`App API Layer` 和 `Supabase Responsibilities`
  - 配置环境变量读取、Supabase 客户端封装、基础日志与错误处理中间件，覆盖 Requirement 10 的 V0.1 交付目标
  - 定义前后端共享的领域类型和接口骨架，包括 `KnowledgeBase`、`Folder`、`Note`、`Group`、`ResourceShare`、`ApiKey`、`SyncMetadata`
  - [x]* 1.1 为工程初始化编写基础健康检查与配置加载测试
    - 为前端和 API 服务的启动配置编写单元测试
    - 为环境变量校验和 Supabase 客户端初始化编写测试

- [x] 2. 实现核心数据模型、数据库迁移和 RLS 策略
  - 创建 `user_profiles`、`knowledge_bases`、`folders`、`notes`、`sync_events`、`groups`、`group_invitations`、`group_members`、`resource_shares`、`embedding_jobs`、`note_chunks`、`note_embeddings`、`api_keys` 的迁移脚本，对应 Requirement 2、3、4、7、9
  - 为私有资源表实现 `owner_user_id = auth.uid()` 的 RLS 策略，并对高价值表追加强制 RLS，覆盖设计中的 Correctness Property 1
  - 为共享访问实现基于 `resource_shares` 与 `group_members` 的读写策略，覆盖 Requirement 4 与 Correctness Property 2
  - [ ]* 2.1 为私有资源 RLS 策略编写集成测试
    - 验证资源所有者可读写，非所有者被拒绝
    - 验证越权访问返回授权失败结果
  - [ ]* 2.2 为共享资源 RLS 策略编写集成测试
    - 验证 `read` 权限成员可读不可写
    - 验证 `write` 权限成员可读可写

- [x] 3. 实现认证、会话恢复和用户工作区初始化
  - 接入 Supabase Auth 的邮箱注册、登录、登出与会话恢复流程，覆盖 Requirement 1
  - 实现用户资料初始化和默认工作区加载逻辑，使登录成功后能够加载云端知识库列表，覆盖 Requirement 1.2 和 Requirement 6.1
  - 处理登录失败、会话过期和离线只读回退状态，覆盖 Requirement 1.4 和设计中的 Authentication Errors
  - [x]* 3.1 为认证接口和会话恢复流程编写集成测试
    - 验证注册、登录、登出和会话恢复成功路径
    - 验证认证失败和会话过期路径

- [x] 4. 实现知识库、文件夹和笔记的基础 CRUD API
  - 在独立 API 服务中实现 `knowledge-bases`、`folders`、`notes` 相关 REST 接口，覆盖 Requirement 2 和设计中的 Knowledge Base Endpoints
  - 在服务端统一封装资源归属校验、软删除、版本号更新和错误响应，覆盖 Requirement 2.1、2.4 和 Correctness Property 1
  - 为知识库树和笔记读取返回前端所需的最小聚合结构，支撑 NoteGen 风格的树状导航体验，覆盖 Requirement 5 和 Requirement 6
  - [x]* 4.1 为知识库、文件夹和笔记 CRUD 编写 API 集成测试
    - 验证创建、查询、更新、删除和软删除过滤
    - 验证跨用户访问被拒绝

- [x] 5. 实现浏览器端知识库树、编辑器工作区与草稿缓存
  - 构建知识库列表、树状目录、笔记详情和编辑器页面，复用 NoteGen 风格的信息架构，覆盖 Requirement 5
  - 实现 `WorkspaceState`、`DraftState` 和编辑器保存流程，使变更先进入浏览器缓存再进入同步队列，覆盖 Requirement 5.1、5.2
  - 增加弱网状态提示、草稿恢复和最近访问数据恢复逻辑，覆盖 Requirement 5.1 和设计中的前端错误处理要求
  - [x]* 5.1 为浏览器缓存、草稿恢复和工作区状态编写前端测试
    - 验证刷新页面后草稿恢复
    - 验证弱网状态下编辑内容保留

- [x] 6. 实现 SyncService 与多端增量同步流程
  - 实现 `SyncService.enqueue`、同步状态机、重试机制和 `sync_events` 写入逻辑，覆盖 Requirement 5.2、5.3、5.4
  - 实现应用启动、页面切换和 Realtime 触发的增量拉取与合并逻辑，覆盖 Requirement 6.1、6.2、6.4
  - 实现基于 `version + content_hash` 的冲突检测与 `ConflictRecord` 生成逻辑，覆盖 Requirement 6.3 和 Correctness Property 5
  - [x]* 6.1 为同步状态机编写单元测试
    - 验证新增、更新、删除、失败重试和成功收敛路径
  - [x]* 6.2 为冲突检测与合并策略编写属性测试
    - 依据 Correctness Property 5 验证同步结果只能收敛到 `synced`、`conflict` 或 `failed`
    - 验证较新的云端版本会触发冲突记录创建

- [x] 7. 检查点 - 确保所有测试通过
  - 确保所有测试通过,如有疑问请询问用户

- [x] 8. 实现群组、邀请、成员管理与共享关系 API
  - 实现 `groups`、`group_invitations`、`group_members`、`shares` 相关接口，覆盖 Requirement 3 和 Requirement 4
  - 实现群组创建者权限、邀请接受流程和共享关系创建逻辑，覆盖 Requirement 3.1、3.2、3.3、4.1、4.2
  - 在服务端增加共享资源的读写权限校验，覆盖 Requirement 4.3、4.4 和 Correctness Property 2
  - [x]* 8.1 为群组与共享接口编写集成测试
    - 验证创建群组、邀请成员、接受邀请和共享资源成功路径
    - 验证非群组所有者修改群组信息被拒绝

- [ ] 9. 实现共享管理界面与共享资源访问体验
  - 构建群组管理、成员列表、邀请入口和共享权限配置页面，覆盖 Requirement 3 和 Requirement 4
  - 在知识库树与笔记界面增加共享资源标识、只读限制和协作访问入口，覆盖 Requirement 4.3、4.4
  - 在前端 AccessContext 中接入群组成员身份和可访问知识域列表，覆盖 Requirement 6.1 和设计中的 Frontend Responsibilities
  - [ ]* 9.1 为共享界面状态和只读限制编写前端测试
    - 验证只读共享资源禁用写入交互
    - 验证共享资源正确显示来源和权限状态

- [ ] 10. 实现向量化任务链路与知识片段持久化
  - 实现笔记同步成功后写入 `embedding_jobs` 的流程，覆盖 Requirement 7.1
  - 实现 Edge Function 或 Worker 读取任务、切分文本、生成 embedding、写入 `note_chunks` 与 `note_embeddings` 的流程，覆盖 Requirement 7.2、7.3
  - 实现基于 `note_id + content_hash` 的幂等去重、失败重试和删除清理逻辑，覆盖 Requirement 7.4 和 Correctness Property 3
  - [ ]* 10.1 为 embedding 任务处理编写契约测试
    - 验证重复任务不会生成多份有效向量结果
    - 验证删除笔记后旧片段和向量记录被清理或跳过

- [ ] 11. 实现 API Key 管理与开发者接口基础能力
  - 实现 `api_keys` 的创建、查询、撤销和哈希存储逻辑，覆盖 Requirement 9.1、9.2、9.4
  - 实现 API Key 作用域绑定到用户私域或群组域的映射逻辑，覆盖 Requirement 9.3 和设计中的 RAG Access Rule
  - 在 API 服务中接入请求审计、调用记录和基础限流钩子，覆盖 Requirement 9.4 和设计中的 Developer Endpoints
  - [ ]* 11.1 为 API Key 生命周期编写集成测试
    - 验证创建后可查询、撤销后不可用
    - 验证不同作用域的访问上下文映射正确

- [ ] 12. 实现对外 RAG API 与权限过滤检索流程
  - 实现 `POST /api/v1/rag/chat`，完成请求校验、API Key 鉴权、向量检索、Prompt 组装和模型调用，覆盖 Requirement 8 和 Requirement 9
  - 在检索 SQL 或服务层查询中注入 `owner_user_id` 与 `share_scope` 过滤，确保结果只来自授权知识域，覆盖 Requirement 8.2 和 Correctness Property 4
  - 返回答案、引用片段、请求标识和错误响应，覆盖 Requirement 8.3、8.4 以及设计中的 RAG Errors
  - [ ]* 12.1 为 RAG API 编写集成测试
    - 验证有效 API Key 可以获得带引用的回答
    - 验证无效 API Key、空授权范围和空检索结果路径
  - [ ]* 12.2 为权限过滤检索编写属性测试
    - 依据 Correctness Property 4 验证任意检索结果都属于授权知识域

- [ ] 13. 检查点 - 确保所有测试通过
  - 确保所有测试通过,如有疑问请询问用户
