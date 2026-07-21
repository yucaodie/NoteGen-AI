# NoteGen Web Parity Requirements

## Introduction

本规格以 `codexu/note-gen` 仓库 `dev` 分支为功能与布局基线，将 NoteGen 的用户可见能力转换为浏览器可交付的 Web 应用。迁移产物采用 GPL-3.0 发布，并以 Web 等价方式实现原版依赖桌面宿主的能力。

## Glossary

- **原版 NoteGen**: `codexu/note-gen` 仓库 `dev` 分支中的应用。
- **Web 版**: SupaNoteGen 的浏览器应用。
- **记录**: 可快速采集的文本、待办、链接、图片、截图、音频与文件素材。
- **工作区**: 用户在浏览器中授权或上传的文件、记录、笔记、设置和同步配置集合。
- **Web 等价能力**: 通过浏览器标准 API、PWA 或受限提示表达原版桌面能力的用户目标。

## Requirements

### Requirement 1: 主工作区布局

**User Story:** AS 笔记用户, I want 使用与原版一致的三栏工作区, so that 我可以连续完成素材管理、写作与 AI 对话。

#### Acceptance Criteria

1. WHEN 用户进入主工作区, Web 版 SHALL 展示左侧资源栏、中央编辑区和右侧聊天栏。
2. WHEN 用户拖动栏间分隔条, Web 版 SHALL 更新对应面板宽度并在下一次访问时恢复宽度。
3. WHEN 用户切换面板可见状态, Web 版 SHALL 支持左栏、中央栏与右栏的独立折叠和展开。
4. WHILE 三栏同时展开, Web 版 SHALL 保持左栏最小宽度 280 像素和编辑区最小宽度 400 像素。

### Requirement 2: 文件与工作区管理

**User Story:** AS 笔记用户, I want 管理工作区文件和文件夹, so that 我可以组织 Markdown、图片和附件。

#### Acceptance Criteria

1. WHEN 用户选择工作区, Web 版 SHALL 展示树状文件夹、文件列表、文件操作工具栏和文件底栏。
2. WHEN 用户创建、重命名、移动、复制、删除或批量选择资源, Web 版 SHALL 更新工作区资源状态和同步队列。
3. WHEN 用户上传文件或文件夹, Web 版 SHALL 将授权文件或上传内容保存到当前工作区。
4. WHEN 用户打开 Markdown、图片或文件夹, Web 版 SHALL 在中央编辑区加载对应视图。

### Requirement 3: 记录与素材采集

**User Story:** AS 笔记用户, I want 快速采集碎片信息, so that 我可以在后续整理为结构化内容。

#### Acceptance Criteria

1. WHEN 用户创建记录, Web 版 SHALL 支持文本、待办、链接、图片、截图、音频和文件类型。
2. WHEN 用户查看记录中心, Web 版 SHALL 提供列表、卡片和紧凑视图，以及类型、标签和时间筛选。
3. WHEN 用户编辑待办或标签, Web 版 SHALL 保存记录属性并反映在记录列表中。
4. WHEN 用户选择多条记录, Web 版 SHALL 提供基于模板整理为笔记的操作入口。

### Requirement 4: Markdown 写作与编辑器

**User Story:** AS 笔记用户, I want 使用完整 Markdown 编辑器, so that 我可以编辑、检索和导出结构化内容。

#### Acceptance Criteria

1. WHEN 用户打开 Markdown 文件, Web 版 SHALL 提供富文本编辑、Markdown 序列化和保存状态。
2. WHEN 用户使用编辑器工具, Web 版 SHALL 支持标题、大纲、表格、代码块、数学公式、Mermaid 图表、图片和斜杠命令。
3. WHEN 用户发起文内搜索或替换, Web 版 SHALL 在当前 Markdown 内容中执行匹配、跳转和替换。
4. WHEN 用户打开编辑器底栏, Web 版 SHALL 显示字数、复制、导出、大纲切换和向量计算状态。

### Requirement 5: AI 与知识问答

**User Story:** AS 笔记用户, I want 使用与原版对应的 AI 功能, so that 我可以整理记录、辅助写作和查询知识。

#### Acceptance Criteria

1. WHEN 用户打开右侧聊天栏, Web 版 SHALL 提供会话历史、模型选择、提示词选择、附件选择和新建会话。
2. WHEN 用户发送对话, Web 版 SHALL 支持流式回复、引用显示、复制、翻译、朗读、写入笔记和继续编辑操作。
3. WHEN 用户在编辑器中请求 AI 操作, Web 版 SHALL 提供续写、改写、翻译、总结和行内建议。
4. WHEN 用户启用知识库检索, Web 版 SHALL 依据当前授权范围执行混合检索并返回引用来源。
5. WHEN 用户选择记录整理模板, Web 版 SHALL 将选中记录、模板和上下文提交至 AI 整理流程。

### Requirement 6: 图片、音频与浏览器采集

**User Story:** AS 笔记用户, I want 采集并理解多媒体素材, so that 素材可以参与后续写作与检索。

#### Acceptance Criteria

1. WHEN 用户授权摄像头或选择图片, Web 版 SHALL 创建图片记录并提供预览、裁剪和描述入口。
2. WHEN 用户授权麦克风, Web 版 SHALL 录制音频并将音频作为记录附件保存。
3. WHEN 用户请求图片理解, Web 版 SHALL 提供 OCR 或视觉识别任务、进度和结果写回流程。
4. WHEN 用户粘贴文本、图片或链接, Web 版 SHALL 提供页面内采集入口并创建对应记录。

### Requirement 7: 同步、版本和离线体验

**User Story:** AS 多设备用户, I want 管理同步和冲突, so that 内容在不同设备上保持可追溯。

#### Acceptance Criteria

1. WHEN 用户配置同步提供商, Web 版 SHALL 支持 GitHub、Gitee、GitLab、Gitea、S3 和 WebDAV 的配置界面与状态展示。
2. WHEN 用户发起同步或拉取, Web 版 SHALL 展示进度、结果、历史记录和失败原因。
3. IF 本地与远端内容发生冲突, Web 版 SHALL 展示冲突详情和可执行的解决操作。
4. WHILE 浏览器离线, Web 版 SHALL 保留本地编辑、记录待同步变更并在网络恢复后重试。

### Requirement 8: 设置、快捷操作与 PWA 映射

**User Story:** AS 高级用户, I want 配置应用与快捷操作, so that Web 版能够延续原版的个人工作流。

#### Acceptance Criteria

1. WHEN 用户进入设置, Web 版 SHALL 提供通用、编辑器、文件、记录、AI、聊天、音频、MCP、提示词、记忆、RAG、同步、模板和快捷键设置页。
2. WHEN 用户设置页面内快捷键, Web 版 SHALL 在当前浏览器页面获得焦点时执行对应操作。
3. WHEN 浏览器支持安装能力, Web 版 SHALL 提供 PWA 安装入口和通知权限状态。
4. WHEN 用户访问原版依赖系统托盘、全局快捷键或本机绝对路径的功能, Web 版 SHALL 展示对应的浏览器替代入口或能力边界说明。

### Requirement 9: 许可与迁移验收

**User Story:** AS 项目维护者, I want 按开源许可交付完整的 Web 迁移, so that 项目可以合法维护并持续验证功能一致性。

#### Acceptance Criteria

1. WHEN Web 版发布源码或部署包, Web 版 SHALL 包含 GPL-3.0 许可证文本、版权声明和原版来源说明。
2. WHEN 原版新增用户可见功能, 迁移清单 SHALL 记录功能状态、Web 映射、验收路径和差异说明。
3. WHEN 完成一个功能域, Web 版 SHALL 提供覆盖核心用户操作的自动化测试。
4. WHEN 原版功能依赖桌面 API, 迁移清单 SHALL 记录浏览器 API、PWA 能力或受限提示的实现方式。
