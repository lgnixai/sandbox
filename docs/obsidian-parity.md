# Obsidian 交互对齐（Parity）规范与重构计划

本文梳理 Obsidian 的关键交互，结合当前代码现状给出对齐规范与实施方案，并分阶段推进优化与重构。

## 一、目标交互（Parity 目标）

- 文件树 → 标签页联动
  - 单击：在“当前活动叶子面板”中以预览标签打开；后续单击复用该预览标签。
  - 双击：固定（Pin）该标签，后续单击不再复用它。固定态显示小锁图标。
  - 标签右键“在资源管理器中显示”：定位到文件树对应项（并展开父级）。

- 标签页（Tabs）
  - 脏记号：未保存内容显示“•”点。
  - 右键菜单：关闭、关闭其它、全部关闭、复制标签、重命名、锁定/解锁、复制路径、在资源管理器中显示、左右/上下分屏。
  - 拖拽排序（后续）、拖出至边缘触发分屏（后续）。

- 面板与分屏（Panes/Splits）
  - 对当前活动标签进行水平/垂直分屏，生成新面板与独立标签栏。
  - 来自文件树的打开动作只落在当前活动叶子面板。

- 编辑器（Editors）
  - Markdown：编辑/预览切换、Ctrl/Cmd+S 保存、保存状态与标签脏点联动。
  - 其它类型（database/canvas/html/code）：逐步补齐，先无脏点联动。

- 命令面板（Command Palette）
  - 快速新建/打开近期/搜索文件、关闭当前标签。

## 二、现状审计（问题与差异）

- 组件重复与风格不一致：
  - 存在 `src/components/Tabs/TabBar.tsx` 与 `src/components/Obeditor/Tab.tsx` 两套标签系统。
  - `Layout/MainEditor.tsx` 实际使用 Obeditor 套件，而不是 `components/Tabs` 套件。
- 状态分散：
  - 面板/分屏/标签树状态保存在 `MainEditor` 的本地 `PanelNode`，未纳入全局 Zustand。
  - 通过 `useAppStore().setEditorCallbacks` 将文件树与编辑器解耦，但存在“活动面板定位不一致”的联动缺陷。
- 功能缺口：
  - 预览标签（单击复用）与固定标签（双击固定）语义未实现。
  - 标签脏点与编辑器保存状态未联动。
  - 标签右键菜单项虽有，但部分动作（在资源管理器中显示等）仅占位行为。
  - 拖拽排序、拖出分屏、持久化会话、键盘导航等仍欠缺。

## 三、架构决策

- 短期：保留 `MainEditor` 的 `PanelNode` 作为分屏与标签的真源，继续通过 `editorCallbacks` 与文件树解耦，实现快速迭代与修复联动问题。
- 中期：将 `PanelNode` 模型收敛进 Zustand（`useAppStore`），以统一应用状态，简化“文件树 ↔ 标签 ↔ 编辑器”的数据流与快照持久化。
- 风格统一：沿用 Obeditor 的设计令牌（如 `bg-card`/`text-foreground`）并整理到 Tailwind 主题层，逐步替换旧样式。

## 四、交互流程（关键用例）

1) 文件树单击（预览标签）：
   - 输入：文件项（noteId/fileId）。
   - 行为：
     - 若当前活动叶子面板已有预览标签，则复用（替换为新文件）。
     - 否则在该叶子面板新建预览标签并激活。
   - 结果：标签不固定，后续单击继续复用。

2) 文件树双击（固定标签）：
   - 输入：文件项。
   - 行为：在当前叶子面板中创建一个“固定”标签，不被后续单击复用。
   - 结果：标签显示锁定图标，可右键解锁。

3) 标签脏点联动：
   - 编辑器内容变化 → 置当前活动标签 `isDirty=true`；保存成功 → 置 `isDirty=false`。

4) 分屏：
   - 从标签右键选择“水平/垂直分屏”，复制当前活动标签到新面板并激活。

## 五、数据模型（最小必需）

在 `PanelNode` 的叶子标签结构中补充：

- Tab = { id, title, isActive, isDirty?, isLocked?, fileId?, filePath? }
- 预览标签语义：`isLocked=false` 且在单击打开时可被复用。

## 六、已完成（本次迭代）

- 将“文件树打开文件”的落点限定为“当前活动叶子面板”，避免跨面板错位激活。
- Markdown 编辑器新增 `onDirtyChange` 回调，并在标签栏显示脏点。

## 七、实施计划与验收标准（阶段性）

- 阶段 A（本周）
  - [x] 修复“活动面板”落点与复用逻辑（已完成）。
  - [x] 标签脏点联动（Markdown）（已完成）。
  - [ ] 预览 vs 固定标签：单击复用、双击固定；UI 显示锁标识。
  - [ ] 标签右键“在资源管理器中显示”：联动文件树展开并高亮。

- 阶段 B（下周）
  - [ ] 持久化面板树与标签至 localStorage，启动时还原。
  - [ ] 标签拖拽排序、基础键盘导航（Ctrl+Tab/Shift+Ctrl+Tab）。
  - [ ] 统一 Obeditor 与旧组件的样式令牌，清理重复 Tab 组件。

- 阶段 C（进阶）
  - [ ] 拖出标签到边缘触发分屏；跨面板拖拽。
  - [ ] 其它编辑器类型的脏点与保存联动。
  - [ ] 将 `PanelNode` 并入 Zustand，统一全局状态。

## 八、代码位置与对接点

- 文件树：`src/components/FileExplorer/FileExplorer.tsx`（通过 `useAppStore().setEditorCallbacks` 与编辑器对接）。
- 主编辑器/分屏：`src/components/Layout/MainEditor.tsx`（维护 `PanelNode` 树、注册 `editorCallbacks`）。
- 标签栏（使用中）：`src/components/Obeditor/Tab.tsx`。
- Markdown 编辑器：`src/components/Obeditor/MarkdownEditor.tsx`（已加 `onDirtyChange`）。

## 九、风险与缓解

- 风格不一致：逐步迁移到统一令牌；阶段内允许小范围样式差异。
- 状态割裂：先通过回调桥接，后统一到 Zustand；过程内确立“单一真源”。
- 依赖缺失导致构建报错：本迭代不引入新 UI 依赖；对未用到的 UI 组件延后修复依赖。
