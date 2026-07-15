# Requirements Document

## Introduction

SupaNoteGen 是一个参考 NoteGen 前端交互体验与树状笔记组织方式、面向浏览器交付的云端知识库平台。系统需要保留优秀的富文本与 Markdown 编辑体验，并通过前后端分离架构提供用户认证、数据隔离、群组共享、向量检索和对外 RAG API。

## Glossary

- **SupaNoteGen**: 本系统，包含浏览器前端、应用服务层与 Supabase 云端能力。
- **Local Cache**: 浏览器本地缓存层，用于暂存编辑内容、同步状态和最近访问数据。
- **SyncService**: 负责本地状态与云端状态双向同步的应用服务。
- **Knowledge Base**: 一组可被同步、共享和检索的笔记集合。
- **Group**: 多用户协作域，成员可按权限访问被共享的知识库或文件夹。
- **RAG API**: 对外暴露的检索增强生成接口。
- **API Credential**: 外部应用访问 RAG API 时使用的鉴权凭据。

## Requirements

### Requirement 1

**User Story:** AS 注册用户, I want 使用邮箱与密码登录 SupaNoteGen, so that 我可以访问自己的云端知识库。

#### Acceptance Criteria

1. WHEN 访客提交有效的邮箱和密码注册信息, SupaNoteGen SHALL 创建用户账户并建立对应的用户资料记录。
2. WHEN 注册用户提交有效的邮箱和密码登录信息, SupaNoteGen SHALL 创建认证会话并加载该注册用户的云端工作区。
3. WHILE 认证会话有效, SupaNoteGen SHALL 在前端请求中附带用户身份令牌以访问受保护资源。
4. IF 注册或登录请求失败, SupaNoteGen SHALL 返回可识别的失败原因并保持本地未同步数据不丢失。

### Requirement 2

**User Story:** AS 注册用户, I want 我的笔记和知识库被严格隔离, so that 其他用户无法访问我的私有内容。

#### Acceptance Criteria

1. WHEN SupaNoteGen 持久化笔记、文件夹或知识库记录, SupaNoteGen SHALL 将记录绑定到明确的 `user_id`。
2. WHILE 用户访问私有笔记数据, SupaNoteGen SHALL 仅返回与当前认证用户身份匹配的数据记录。
3. WHEN 数据库执行笔记、文件夹、知识库和向量检索查询, SupaNoteGen SHALL 通过 Row Level Security 在数据库层执行访问控制。
4. IF 用户请求访问无授权数据, SupaNoteGen SHALL 拒绝请求并记录授权失败事件。

### Requirement 3

**User Story:** AS 注册用户, I want 创建群组并邀请成员, so that 我可以围绕知识库开展协作。

#### Acceptance Criteria

1. WHEN 群组所有者提交有效的群组信息, SupaNoteGen SHALL 创建群组记录并将群组所有者写入成员关系。
2. WHEN 群组所有者邀请其他已注册用户, SupaNoteGen SHALL 创建待接受的群组邀请记录。
3. WHEN 被邀请用户接受邀请, SupaNoteGen SHALL 将被邀请用户加入群组成员关系。
4. IF 非群组所有者修改群组核心信息, SupaNoteGen SHALL 拒绝该请求。

### Requirement 4

**User Story:** AS 群组成员, I want 共享知识库或笔记文件夹, so that 群组内成员可以按权限协作。

#### Acceptance Criteria

1. WHEN 资源所有者选择一个知识库或笔记文件夹并指定目标群组, SupaNoteGen SHALL 创建共享关系记录。
2. WHEN 资源所有者设置共享权限级别, SupaNoteGen SHALL 支持 `read` 与 `write` 两种权限。
3. WHILE 群组成员访问共享资源, SupaNoteGen SHALL 根据共享关系和成员关系授予读取或写入能力。
4. IF 群组成员仅具备 `read` 权限, SupaNoteGen SHALL 拒绝对共享资源的写入操作。

### Requirement 5

**User Story:** AS 笔记编辑者, I want 保持浏览器中的高响应编辑体验, so that 我在日常使用中可以连续编辑与浏览知识内容。

#### Acceptance Criteria

1. WHILE 客户端处于弱网或短时断连状态, SupaNoteGen SHALL 允许用户继续编辑当前笔记并把变更写入浏览器本地缓存。
2. WHEN 本地笔记、文件夹或知识库发生新增、修改或删除, SupaNoteGen SHALL 记录同步事件并进入待同步队列。
3. WHEN 客户端恢复网络连接, SupaNoteGen SHALL 按顺序提交待同步事件到云端。
4. IF 云端同步失败, SupaNoteGen SHALL 保留本地版本并展示可重试的同步状态。

### Requirement 6

**User Story:** AS 多端用户, I want 本地状态与云端状态保持一致, so that 我可以在不同设备间连续工作。

#### Acceptance Criteria

1. WHEN 应用启动完成认证初始化, SupaNoteGen SHALL 拉取当前用户可访问范围内的最新云端元数据与内容摘要。
2. WHEN 用户切换到知识库、文件夹或笔记页面, SupaNoteGen SHALL 校验本地状态与云端版本状态并执行必要的增量同步。
3. WHEN 本地版本与云端版本发生冲突, SupaNoteGen SHALL 依据预定义冲突策略生成可审计的冲突结果。
4. IF 云端记录已被其他设备更新, SupaNoteGen SHALL 在当前设备展示状态变化并提供重新加载结果。

### Requirement 7

**User Story:** AS 平台运营者, I want 在笔记同步后生成向量数据, so that 系统可以执行语义检索。

#### Acceptance Criteria

1. WHEN 笔记内容成功同步到云端, SupaNoteGen SHALL 触发向量化处理流程。
2. WHEN 向量化处理流程运行, SupaNoteGen SHALL 将可检索文本切分为文档片段并写入向量表。
3. WHILE 向量化处理流程写入向量表, SupaNoteGen SHALL 保持片段与源笔记、所有者、共享范围之间的关联。
4. IF 向量化处理失败, SupaNoteGen SHALL 记录失败状态并支持后续重试。

### Requirement 8

**User Story:** AS 外部应用开发者, I want 调用标准化的 RAG API, so that 我可以基于授权知识库生成回答。

#### Acceptance Criteria

1. WHEN 外部应用向 `POST /api/v1/rag/chat` 发送有效请求, SupaNoteGen SHALL 执行知识检索、提示词拼装和答案生成流程。
2. WHEN RAG API 检索知识片段, SupaNoteGen SHALL 仅返回属于调用方授权范围内的知识片段。
3. WHEN RAG API 返回答案, SupaNoteGen SHALL 返回答案内容、引用片段和必要的请求元数据。
4. IF RAG API 请求缺少有效鉴权信息, SupaNoteGen SHALL 拒绝请求并返回未授权结果。

### Requirement 9

**User Story:** AS 平台运营者, I want 对外 RAG API 采用 API Key 鉴权, so that 平台可以控制调用范围与成本。

#### Acceptance Criteria

1. WHEN 平台创建 API Credential, SupaNoteGen SHALL 生成可轮换且可撤销的凭据记录。
2. WHILE 外部应用调用 RAG API, SupaNoteGen SHALL 校验 API Credential 的有效性、归属范围与状态。
3. WHEN API Credential 绑定到指定用户或群组知识域, SupaNoteGen SHALL 按绑定范围限制检索目标。
4. IF API Credential 被撤销或超出配额策略, SupaNoteGen SHALL 拒绝请求并记录审计日志。

### Requirement 10

**User Story:** AS 项目团队, I want 按阶段交付 SupaNoteGen Web 平台, so that 系统能力可以以低风险方式逐步上线。

#### Acceptance Criteria

1. WHEN 团队交付 V0.1, SupaNoteGen SHALL 完成本地数据到 Supabase 的基础同步闭环。
2. WHEN 团队交付 V0.2, SupaNoteGen SHALL 完成 Auth 集成与用户级数据隔离。
3. WHEN 团队交付 V0.3, SupaNoteGen SHALL 完成群组管理与共享权限控制。
4. WHEN 团队交付 V0.4, SupaNoteGen SHALL 完成向量化流程与对外 RAG API。

### Requirement 11

**User Story:** AS 笔记编辑者, I want 使用中文 NoteGen 式浏览器工作台完成知识创作和管理, so that 我可以在一个界面内完成新建、编辑、记录、同步、共享和 AI 检索操作。

#### Acceptance Criteria

1. WHEN 注册用户进入工作区, SupaNoteGen SHALL 展示中文的顶栏、模块导航、资源树、编辑器和右侧辅助面板。
2. WHEN 用户点击新建笔记、新建记录、新建文件夹或新建知识库, SupaNoteGen SHALL 调用真实 API 创建对应资源并更新当前工作区状态。
3. WHILE 用户编辑笔记或记录, SupaNoteGen SHALL 保存本地草稿并展示同步状态、版本状态和保存结果。
4. WHILE 用户访问共享资源, SupaNoteGen SHALL 展示共享来源、权限级别和只读限制。
5. WHEN 用户打开 AI 或开发者入口, SupaNoteGen SHALL 展示与当前知识库和授权范围关联的 RAG/API Key 操作入口。
6. IF 前端操作失败, SupaNoteGen SHALL 以中文展示失败原因并保留用户当前编辑内容。
