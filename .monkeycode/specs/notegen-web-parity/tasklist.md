# 需求实施计划

- [x] 1. 重建三栏可拖拽布局与面板折叠
  - 安装 react-resizable-panels 依赖，替换现有自定义布局
  - 实现 sidebarStore：管理 leftSidebarVisible / centerPanelVisible / rightSidebarVisible 和左侧 Tab 切换（files/notes），持久化到 localStorage
  - 实现 page.tsx 三栏 ResizablePanelGroup：左栏最小 280px 宽、中栏最小 400px 宽、折叠态 0%，默认比例 [30%, 40%, 30%]
  - 实现布局持久化：按可见面板组合键 (如 left-center-right) 存储到 localStorage，刷新后恢复
  - 实现面板折叠防呆：至少保留一个面板可见，禁止仅左栏可见状态
  - 覆盖 Requirement 1 的全部验收标准

- [x] 2. 实现左侧文件管理器
  - 实现 FileSidebar 组件骨架：FileActions 顶栏按钮（新建文件、新建文件夹、刷新、更多）、FileManager 文件树递归渲染、FileFooter 工作区切换器
  - 实现 FileManager：递归 Tree 组件渲染 FileItem 和 FolderItem，支持展开折叠、框选多文件、右键上下文菜单（新建、粘贴、删除、重命名）、拖放导入 Markdown 和图片
  - 实现 FileActions 和 FileMoreMenu：新建文件、新建文件夹、导入 Markdown 等操作入口
  - 实现 FileFooter：当前工作区名称展示、工作区下拉选择、工作区列表
  - 实现 articleStore 核心：DirTree 文件树、activeFilePath、文件排序、文件操作、标签页管理
  - 覆盖 Requirement 2 的全部验收标准

- [x] 3. 实现记录采集与管理中心
- [x] 4. 实现完整 Markdown 编辑器
- [x] 5. 实现右侧 AI 聊天栏
- [x] 6. 实现设置页面体系
- [x] 7. 实现 Stores 数据层
- [x] 8. 检查点 - 确保所有核心组件可编译和渲染
- [x] 9. 实现 Web 能力适配层（PWA + SW + capabilities.ts）
- [x] 10. 实现 GPL-3.0 许可合规
- [/] 11. 功能一致性对照与验收保障
  - [x] 11.1 Playwright 关键路径冒烟测试（core-main.spec.ts）
  - [ ] 11.2 更多组件测试和交互测试
- [x] 12. 检查点 - 构建验证与功能预览
  - 运行 npm run build -w apps/web 确保无编译错误
  - [ ]* 12.1 运行测试套件
    - npm run test -w apps/web
    - npm run test:ui -w apps/web
  - 通过预览验证三栏布局、记录采集、Markdown 编辑、AI 对话和设置配置
  - 如有疑问请询问用户
