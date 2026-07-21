# 需求实施计划

- [ ] 1. 重建三栏可拖拽布局与面板折叠
  - 安装 react-resizable-panels 依赖，替换现有自定义布局
  - 实现 sidebarStore：管理 leftSidebarVisible / centerPanelVisible / rightSidebarVisible 和左侧 Tab 切换（files/notes），持久化到 localStorage
  - 实现 page.tsx 三栏 ResizablePanelGroup：左栏最小 280px 宽、中栏最小 400px 宽、折叠态 0%，默认比例 [30%, 40%, 30%]
  - 实现布局持久化：按可见面板组合键 (如 left-center-right) 存储到 localStorage，刷新后恢复
  - 实现面板折叠防呆：至少保留一个面板可见，禁止仅左栏可见状态
  - 覆盖 Requirement 1 的全部验收标准

- [ ] 2. 实现左侧文件管理器
  - 实现 FileSidebar 组件骨架：FileActions 顶栏按钮（新建文件、新建文件夹、刷新、更多）、FileManager 文件树递归渲染、FileFooter 工作区切换器
  - 实现 FileManager：递归 Tree 组件渲染 FileItem 和 FolderItem，支持展开折叠、框选多文件、右键上下文菜单（新建、粘贴、删除、重命名）、拖放导入 Markdown 和图片
  - 实现 FileActions 和 FileMoreMenu：新建文件、新建文件夹、导入 Markdown 等操作入口
  - 实现 FileFooter：当前工作区名称展示、工作区下拉选择、工作区列表
  - 实现 articleStore 核心：DirTree 文件树、activeFilePath、文件排序、文件操作、标签页管理
  - 覆盖 Requirement 2 的全部验收标准

- [ ] 3. 实现记录采集与管理中心
  - 实现 NoteSidebar 组件骨架：RecordSyncStatusBanner、TagManage 标签管理、MarkList 记录列表（含三种视图）、MarkToolbar 计数栏
  - 实现 MarkActions 顶栏操作：新建标签、MarkFilterPopover 筛选（关键词、类型、时间）、整理笔记入口、更多菜单（垃圾桶）
  - 实现 MarkList 与三种视图：MarkListDefaultView（详情列表）、MarkListCompactView（紧凑列表）、MarkListCardView（卡片视图）
  - 实现 MarkDetailPanel：根据记录类型（文本/图片/语音/文件/链接/待办/扫描）渲染对应控件，支持编辑、删除、标签管理
  - 实现 control-* 系列控件：control-text、control-image、control-todo、control-scan、control-file、control-link、control-recording
  - 实现 tagStore 和 markStore：标签 CRUD、记录列表、筛选状态、视图模式、多选和垃圾桶状态
  - 实现录音控件：通过 MediaRecorder API 录制音频并作为记录保存
  - 实现剪贴板监听：粘贴文本、图片、链接时创建对应记录
  - 实现 AI 整理记录入口：选中多条记录后选择模板，提交至整理流程
  - 覆盖 Requirement 3 和 Requirement 6 的全部验收标准

- [ ] 4. 实现完整 Markdown 编辑器
  - 安装 TipTap 及其扩展（表格、代码块、数学公式、Mermaid、图片、气泡菜单等）
  - 实现 MdEditorWrapper：集成 TiptapEditor，支持标题、大纲、表格、代码块、数学公式、Mermaid 图表、图片和斜杠命令
  - 实现 BubbleMenu 和 FloatingTableMenu：选中文本和表格时的浮动操作菜单
  - 实现 Outline 文档大纲面板：实时提取标题层级并支持跳转
  - 实现 FooterBar：WordCount 字数统计、CopyButton 复制、ExportButton 导出（Markdown/HTML）、OutlineToggle 大纲切换、VectorCalc 向量状态
  - 实现 SearchReplacePanel：文内搜索、跳转和替换
  - 实现编辑器多标签页 TabBar：新建、切换、关闭、右键上下文菜单（关闭其他/全部/左侧/右侧）
  - 实现编辑器布局 EditorLayout：根据活动 Tab 类型（Markdown/Image/Folder/Record/Unknown）渲染对应编辑器
  - 实现 AI 辅助：AiCompletion 续写建议、AiSuggestionFloating 浮动命令菜单、行内改写/翻译/总结入口
  - 覆盖 Requirement 4 的全部验收标准

- [ ] 5. 实现右侧 AI 聊天栏
  - 实现 Chat 骨架：ChatHeader（模型选择、历史下拉、新建/清空对话）、ChatContent（消息列表）和 ChatFooter
  - 实现 ChatEmpty、ChatPreview、ChatThinking：空状态、消息渲染和流式思考指示
  - 实现 ChatInput：输入框、QuoteDisplay 引用、ImageAttachments 图片附件、ChatFileAttachments 文件附件、ChatSend 发送按钮
  - 实现 ChatToolsPopover：McpButton 开关、PromptSelect 模板选择、FileSelector 文件选择、RagSwitch RAG 开关、ClearContext 清除上下文
  - 实现 MessageControl：CopyControl 复制、TranslateControl 翻译、ReadAloudControl 朗读、NoteOutput 输出为笔记、MessageInfo 消息信息
  - 实现 chatStore：消息列表管理、流式回复更新、会话持久化到 IndexedDB、对话按标签隔离
  - 实现 Agent 相关组件：AgentPanelWithRag、AgentExecutionStatus、AgentApprovalPanel、AgentPermissionModeSelect、AgentContextTray
  - 覆盖 Requirement 5 的全部验收标准

- [ ] 6. 实现设置页面体系
  - 实现设置页面布局：左侧设置导航锚点列表 + 右侧设置内容区域，支持分组和分隔线
  - 实现通用设置：主题、字体、字号缩放、界面语言、工具开关
  - 实现 AI 模型管理设置：模型列表、新增/编辑/删除模型、模型卡片展示、默认模型选择
  - 实现编辑器设置：AI 续写开关、大纲配置、居中内容、提交信息格式
  - 实现记录设置：记录模型配置、记录工具栏配置
  - 实现聊天设置：主模型选择、上下文压缩设置
  - 实现同步设置：GitHub / Gitee / GitLab / Gitea / S3 / WebDAV 各平台配置界面
  - 实现图片识别设置：OCR 模型配置、VLM 模型配置
  - 实现 RAG 设置：chunk 参数、相似度阈值、rerank 阈值、嵌入模型
  - 实现 MCP 设置：服务器列表、新增/编辑/删除/连接测试、工具浏览、JSON 导入
  - 实现 Skills 设置：全局/项目技能管理、启用/禁用、安装操作
  - 实现 Prompt 模板、记忆、模板、快捷键、文件工作区、图床、音频、朗读设置页
  - 覆盖 Requirement 8 的全部验收标准

- [ ] 7. 实现 Stores 数据层
  - 实现 sidebarStore：三面板可见性（left/center/right）、左侧标签页切换
  - 实现 articleStore：文件树 DirTree、活动文件路径、标签页 openTabs、文章内容、排序、云文件状态
  - 实现 markStore：记录列表、标签筛选、视图模式、排序、垃圾桶、多选、记录队列
  - 实现 chatStore：消息列表、Agent 状态、MCP 调用、上下文引用、消息压缩
  - 实现 settingStore：所有应用设置（AI 模型、语言、字体、主题、图床、同步配置等）
  - 实现 tagStore、clipboardStore、syncStore、vectorStore、recordingStore
  - 实现 settingsDialogStore、promptStore、memoriesStore、ragSettingsStore
  - 实现 Web 持久化适配：Tauri Store 调用替换为 IndexedDB / localStorage，保持与原版兼容的数据结构
  - 实现 EventEmitter 工具：用于编辑器内容更新、文件路径变更、快捷键触发等跨面板通信

- [ ] 8. 检查点 - 确保所有核心组件可编译和渲染
  - 运行 npm run build -w apps/web 确保无编译错误
  - 验证三栏布局、文件树、记录列表和编辑器可正常渲染

- [ ] 9. 实现 Web 能力适配层
  - 实现文件系统适配：File System Access API 读取/写入、回退到文件上传下载
  - 实现录音适配：MediaRecorder API 绑定 recordingStore
  - 实现剪贴板适配：Navigator.clipboard API 读取文本/图片
  - 实现语音识别适配：SpeechRecognition API（浏览器环境）
  - 实现通知适配：Notification API 权限请求和发送
  - 实现 PWA 适配：manifest.json、Service Worker、安装提示、离线缓存
  - 实现页面内快捷键：通过键盘事件捕获实现原版快捷键功能映射
  - 实现能力检测工具：检测浏览器 API 可用性并在不支持时展示降级提示或替代路径
  - 覆盖 Requirement 8.2、8.3 和 Requirement 9.4

- [ ] 10. 实现 GPL-3.0 许可合规
  - 在项目根目录写入 GPL-3.0 LICENSE 文件
  - 在应用首页或关于页面中展示版权声明和原版来源说明
  - 实现关于设置页：应用版本、技术栈、许可证信息和更新检查入口
  - 覆盖 Requirement 9.1

- [ ] 11. 功能一致性对照与验收保障
  - 建立 ParityItem 对照表：为原版每个用户可见功能记录组件来源路径、Web 映射状态和验收用例
  - [ ]* 11.1 编写 Playwright 关键路径测试
    - 覆盖三栏折叠恢复、新建文件/文件夹、记录采集、Markdown 编辑、AI 对话、同步和冲突处理
  - [ ]* 11.2 编写组件测试
    - 覆盖文件树渲染、记录筛选、编辑器工具、聊天消息列表、设置页面配置持久化
  - 覆盖 Requirement 9.2、9.3

- [ ] 12. 检查点 - 构建验证与功能预览
  - 运行 npm run build -w apps/web 确保无编译错误
  - [ ]* 12.1 运行测试套件
    - npm run test -w apps/web
    - npm run test:ui -w apps/web
  - 通过预览验证三栏布局、记录采集、Markdown 编辑、AI 对话和设置配置
  - 如有疑问请询问用户
