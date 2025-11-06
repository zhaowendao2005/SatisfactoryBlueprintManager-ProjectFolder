# 自动化操作 GUI 功能技术设计方案

## 📋 第一部分：设计概览
```
【目标】：为 SatisfactoryBlueprintManager 新增自动化操作配置管理功能，支持手动定位配置与实时保存
【范围】：
  在范围内：
    - MainWindow.Navbar 新增设置选项（Settings）
    - Settings 页面的左右栏布局（锚点导航 + 内容区）
    - 自动化配置管理（增删改选，基于配置文件）
    - 手动配置模式的表单（输入栏定位、蓝图位置定位、字符输入速度）
    - 配置文件的实时读写（AppData/Data/AutomationConfigs/）
  不在范围内：
    - 实际的自动化执行逻辑（后续任务）
    - 其他自动化模式（如智能检测模式）
    - 定位按钮的实际定位功能（仅 UI 占位）

【技术栈决策】：
  - 锚点导航：Element Plus Anchor 组件（原因：提供开箱即用的锚点定位与高亮）
  - 布局方案：Flex 布局 + overflow-y: scroll（原因：简单可靠，无需虚拟滚动）
  - 配置存储：独立 JSON 文件 + crypto.createHash（原因：复用现有 ConfigFileService 模式）
  - 状态管理：Pinia Store（原因：与现有架构一致，支持配置列表与当前编辑配置的分离）
  - 表单校验：Quasar QInput 内置校验（原因：与现有 UI 库一致）

【架构模式】：
  - 页面层：左右栏布局（Anchor + ScrollArea）
  - 业务层：Store 负责状态管理，Electron IPC 负责配置文件读写
  - 数据层：类似 Blueprint ConfigFileService 的 AutomationConfigService

【核心约束】：
  - 配置文件名格式：{name}-{4位哈希}.json（哈希基于 name + timestamp）
  - 配置目录路径：{app.getPath('userData')}/Data/AutomationConfigs/
  - 字符输入速度范围：10ms - 1000ms，默认 100ms
  - 定位坐标类型：{ x: number, y: number }，默认 { x: 0, y: 0 }
  - 显示器序号：number | null（未来记录操作的显示器序号，默认 null）
  - 配置实时保存：表单输入防抖 500ms 后自动保存，输入栏失焦时立即保存
```
---

## 🏗️ 第二部分：模块划分与职责

```
自动化配置功能模块（职责：管理自动化操作的配置与 UI）
  │
  ├─ A. UI 层（职责：用户交互与数据展示）
  │   ├─ A1. MainWindow.Navbar 扩展（职责：新增 Settings 导航项）
  │   │   ├─ 输入：无
  │   │   ├─ 输出：路由跳转事件（route: '/settings'）
  │   │   └─ 关键逻辑：
  │   │       1. 在 bottomNavItems 数组中新增 Settings 项
  │   │       2. 在 nav-group-bottom 与 nav-group-top 之间插入分割线（<q-separator>）
  │   │       3. 使用 justify-content: flex-end 保证 Settings 贴底对齐
  │   │
  │   ├─ A2. Settings 页面主布局（职责：实现左右栏分割与锚点联动）
  │   │   ├─ 输入：无
  │   │   ├─ 输出：渲染两列布局（左：Anchor，右：Content）
  │   │   └─ 关键逻辑：
  │   │       1. 使用 Flex 布局：display: flex, flex-direction: row, height: 100%
  │   │       2. 左侧锚点栏：width: 200px, flex-shrink: 0, overflow-y: auto, min-height: 0（独立滚动）
  │   │       3. 右侧内容栏：flex: 1, overflow-y: auto, padding: 24px, min-height: 0（独立滚动，跟随上级div高度）
  │   │       4. <el-anchor> 绑定 container 为右侧滚动容器，锚点栏自身独立滚动
  │   │       5. <el-anchor-link> 的 href 与内容区的 id 对应
  │   │       6. 禁止使用虚拟滚动，使用最基本的 overflow + scroll + min-height 方案
  │   │
  │   ├─ A3. 配置管理卡片（职责：增删改选配置文件）
  │   │   ├─ 输入：AutomationConfigStore.configList（配置列表）
  │   │   ├─ 输出：当前选中的配置（AutomationConfigStore.currentConfig）
  │   │   └─ 关键逻辑：
  │   │       - 新增：点击"新建"按钮 → 生成默认配置 → 调用 store.createConfig()
  │   │       - 选择：点击配置卡片 → 调用 store.loadConfig(id)
  │   │       - 删除：点击删除按钮 → 弹出确认对话框 → 调用 store.deleteConfig(id)
  │   │       - 重命名：双击配置名称 → 进入编辑模式 → 失焦后调用 store.renameConfig(id, newName)
  │   │       - 高度固定：max-height: 300px, overflow-y: auto
  │   │
  │   └─ A4. 自动化配置表单卡片（职责：配置自动化参数）
  │       ├─ 输入：AutomationConfigStore.currentConfig.params（当前配置参数）
  │       ├─ 输出：参数变更事件（触发 store.updateConfigParams()）
  │       └─ 关键逻辑：
  │           - 横向模式选择器：<q-tabs> 圆角样式，初始仅"手动配置"选项
  │           - 动态内容渲染：<component :is="currentModeComponent" />
  │           - 手动配置模式组件：ManualConfigForm.vue
  │           - 高度固定：max-height: 400px, 表单内容可滚动
  │           - 防抖保存：watch(currentConfig.params, debounce(save, 500))
  │           - 失焦保存：监听输入框 @blur 事件，立即保存（不等待防抖）
  │
  ├─ B. 状态管理层（职责：管理配置列表与当前编辑配置）
  │   └─ B1. AutomationConfigStore（职责：配置 CRUD 与状态同步）
  │       ├─ State：
  │       │   {
  │       │     configList: AutomationConfigMeta[],    // 配置列表（元信息）
  │       │     currentConfigId: string | null,        // 当前选中的配置 ID
  │       │     currentConfig: AutomationConfigData | null, // 当前完整配置数据
  │       │     isLoading: boolean                    // 是否正在加载
  │       │   }
  │       │
  │       ├─ Actions：
  │       │   - async loadConfigList(): Promise<void>
  │       │       从 IPC 加载配置列表 → 更新 configList
  │       │   - async loadConfig(id: string): Promise<void>
  │       │       从 IPC 加载完整配置 → 更新 currentConfig
  │       │   - async createConfig(name: string): Promise<string>
  │       │       生成默认配置 → 调用 IPC 保存 → 返回新配置 ID → 自动加载
  │       │   - async updateConfigParams(params: Partial<ManualConfigParams>): Promise<void>
  │       │       合并参数 → 调用 IPC 保存 → 更新 currentConfig
  │       │   - async deleteConfig(id: string): Promise<void>
  │       │       调用 IPC 删除 → 从 configList 移除 → 清空 currentConfig（如果当前选中）
  │       │   - async renameConfig(id: string, newName: string): Promise<void>
  │       │       调用 IPC 重命名 → 更新 configList 中的元信息
  │       │
  │       └─ 错误处理：
  │           - IPC 调用失败时捕获错误，使用 Quasar Notify 显示错误信息
  │           - 配置文件损坏时返回 null，UI 层显示"配置加载失败"占位
  │
  └─ C. 数据持久化层（职责：配置文件的读写操作）
      └─ C1. AutomationConfigService（职责：封装配置文件 I/O）
          ├─ 依赖：Node.js fs.promises, path, crypto, electron.app
          ├─ 方法：
          │   - async listConfigs(): Promise<AutomationConfigMeta[]>
          │       扫描 AutomationConfigs 目录 → 读取所有 .json 文件 → 提取元信息 → 按创建时间倒序
          │   - async loadConfig(id: string): Promise<AutomationConfigData | null>
          │       读取 {id}.json → 解析 JSON → 返回数据（失败返回 null）
          │   - async saveConfig(data: AutomationConfigData): Promise<void>
          │       更新 updatedAt → JSON.stringify(data, null, 2) → 写入文件
          │   - async deleteConfig(id: string): Promise<void>
          │       fs.unlink({id}.json)（不存在时静默跳过）
          │   - async renameConfig(id: string, newName: string): Promise<void>
          │       读取配置 → 修改 name 字段 → 保存
          │   - generateConfigId(name: string): string
          │       计算哈希：crypto.createHash('md5').update(name + Date.now()).digest('hex').slice(0, 4)
          │       返回：`${name.replace(/\s+/g, '_')}-${hash}`
          │
          └─ 错误处理：
              - 目录不存在时自动创建（ensureConfigDir）
              - JSON 解析失败时记录日志并返回 null
              - 文件写入失败时抛出异常（由上层处理）
```

---

## 🔌 第三部分：关键接口定义

```typescript
// ===== 1. 配置数据类型定义 =====

/**
 * 自动化配置元信息
 * @注意事项 id 是唯一标识，格式为 {name}-{4位哈希}
 */
interface AutomationConfigMeta {
  id: string          // 配置 ID（文件名不含扩展名）
  name: string        // 配置显示名称
  createdAt: number   // 创建时间戳
  updatedAt: number   // 更新时间戳
}

/**
 * 自动化配置完整数据
 * @注意事项 存储路径：{userData}/Data/AutomationConfigs/{id}.json
 */
interface AutomationConfigData {
  id: string
  name: string
  version: string                      // 配置格式版本，初始 "1.0.0"
  mode: 'manual' | 'smart'             // 自动化模式（当前仅实现 manual）
  params: ManualConfigParams | SmartConfigParams  // 根据 mode 动态类型
  createdAt: number
  updatedAt: number
}

/**
 * 手动配置模式参数
 * @注意事项 坐标 (0, 0) 表示未配置，需在 UI 层提示用户定位
 */
interface ManualConfigParams {
  inputFieldPosition: { x: number; y: number }   // 输入栏屏幕坐标
  firstBlueprintPosition: { x: number; y: number } // 第一位蓝图屏幕坐标
  charInputDelay: number                          // 字符输入间隔（ms），范围 10-1000
  displayIndex: number | null                     // 显示器序号（未来记录操作的显示器序号），默认 null
}

/**
 * 智能配置模式参数（占位，暂不实现）
 */
interface SmartConfigParams {
  autoDetect: boolean
  confidence: number  // 识别置信度阈值
}

// ===== 2. Store 接口定义 =====

/**
 * AutomationConfigStore 状态接口
 */
interface AutomationConfigState {
  configList: AutomationConfigMeta[]           // 配置列表
  currentConfigId: string | null               // 当前选中配置 ID
  currentConfig: AutomationConfigData | null   // 当前完整配置数据
  isLoading: boolean                           // 加载状态
}

/**
 * AutomationConfigStore Actions
 */
interface AutomationConfigActions {
  /** 加载配置列表（仅元信息） */
  loadConfigList(): Promise<void>
  
  /** 加载完整配置数据，失败时 currentConfig 设为 null */
  loadConfig(id: string): Promise<void>
  
  /** 创建新配置，返回新配置 ID，自动加载为当前配置 */
  createConfig(name: string): Promise<string>
  
  /** 更新当前配置参数（增量更新），自动保存 */
  updateConfigParams(params: Partial<ManualConfigParams>): Promise<void>
  
  /** 删除配置，如果删除的是当前配置则清空 currentConfig */
  deleteConfig(id: string): Promise<void>
  
  /** 重命名配置，不改变文件名（ID） */
  renameConfig(id: string, newName: string): Promise<void>
}

// ===== 3. IPC 通信接口定义 =====

/**
 * 自动化配置 IPC 通道
 * @注意事项 在 preload.ts 中暴露，Frontend 通过 window.electronAPI 调用
 */
interface AutomationConfigIPC {
  /** 列出所有配置（元信息） */
  'automation-config:list': () => Promise<AutomationConfigMeta[]>
  
  /** 加载完整配置数据 */
  'automation-config:load': (id: string) => Promise<AutomationConfigData | null>
  
  /** 保存配置数据（新建或更新） */
  'automation-config:save': (data: AutomationConfigData) => Promise<void>
  
  /** 删除配置 */
  'automation-config:delete': (id: string) => Promise<void>
  
  /** 重命名配置 */
  'automation-config:rename': (id: string, newName: string) => Promise<void>
}

// ===== 4. 组件 Props 定义 =====

/**
 * ManualConfigForm 组件 Props
 */
interface ManualConfigFormProps {
  /** 当前配置参数，双向绑定 */
  modelValue: ManualConfigParams
}

/**
 * ManualConfigForm 组件 Emits
 */
interface ManualConfigFormEmits {
  (e: 'update:modelValue', value: ManualConfigParams): void
}

/**
 * ConfigManagerCard 组件 Props（无需传入，直接使用 Store）
 */
interface ConfigManagerCardProps {}

/**
 * AutomationConfigCard 组件 Props（无需传入，直接使用 Store）
 */
interface AutomationConfigCardProps {}
```

---

## 📊 第四部分：数据流与状态机

```
数据流向（配置加载流程）：
  [用户点击配置卡片] 
    --(配置 ID)--> 
  [Store.loadConfig(id)] 
    --(IPC 调用)--> 
  [Electron Main: AutomationConfigService.loadConfig(id)] 
    --(读取文件)--> 
  [解析 JSON] 
    --(AutomationConfigData)--> 
  [Store.currentConfig = data] 
    --(响应式更新)--> 
  [表单组件渲染]

数据流向（配置保存流程）：
  [用户修改表单字段] 
    --(v-model 绑定)--> 
  [localParams 更新] 
    --(watch 触发，防抖 500ms)--> 
  [Store.updateConfigParams(params)] 
    --(合并参数 + IPC 调用)--> 
  [Electron Main: AutomationConfigService.saveConfig(data)] 
    --(JSON.stringify + 写入文件)--> 
  [保存成功] 
    --(Notify 提示)--> 
  [用户界面]
  
  或（失焦保存）：
  [用户输入框失焦] 
    --(@blur 事件)--> 
  [立即调用保存（取消防抖）] 
    --(Store.updateConfigParams(params))--> 
  [后续流程同上]

配置管理状态机：
  INIT（初始化）
    -> [组件 mounted] -> LOADING（加载列表）
  
  LOADING（加载中）
    -> [listConfigs 成功] -> IDLE（空闲，显示列表）
    -> [listConfigs 失败] -> ERROR（错误，显示提示）
  
  IDLE（空闲）
    -> [点击配置卡片] -> LOADING_CONFIG（加载配置）
    -> [点击新建按钮] -> CREATING（创建配置）
    -> [点击删除按钮] -> DELETING（删除配置）
  
  LOADING_CONFIG（加载配置）
    -> [loadConfig 成功] -> EDITING（编辑中）
    -> [loadConfig 失败] -> IDLE（回到列表，显示错误提示）
  
  EDITING（编辑中）
    -> [修改表单] -> SAVING（防抖保存）
    -> [点击其他配置] -> LOADING_CONFIG（切换配置）
  
  SAVING（保存中）
    -> [saveConfig 成功] -> EDITING（继续编辑）
    -> [saveConfig 失败] -> EDITING（显示错误，数据不回滚）
  
  CREATING（创建中）
    -> [createConfig 成功] -> EDITING（自动加载新配置）
    -> [createConfig 失败] -> IDLE（显示错误）
  
  DELETING（删除中）
    -> [deleteConfig 成功] -> IDLE（刷新列表）
    -> [deleteConfig 失败] -> IDLE（显示错误）
```

---

## ⚠️ 第五部分：关键决策点与实施注意事项

```
决策点 1：配置文件名如何生成？
  选择：{name}-{4位MD5哈希}.json（哈希基于 name + timestamp）
  理由：
    - 防止同名配置冲突（用户可能创建多个"测试配置"）
    - 4 位哈希足够短，方便调试时手动查看文件
    - 基于 timestamp 保证唯一性
  实施要点：
    - name 中的空格替换为下划线（避免文件名问题）
    - 哈希使用 crypto.createHash('md5').update(name + Date.now()).digest('hex').slice(0, 4)
    - 示例：输入 "测试配置" → 生成 "测试配置-a3f2.json"
  反模式：
    ❌ 不要仅用时间戳（用户无法识别）
    ❌ 不要用完整哈希（文件名过长）
    ❌ 不要用自增 ID（多设备同步时冲突）

决策点 2：锚点导航如何与内容区联动？
  选择：Element Plus Anchor 原生 container 属性绑定 + 独立滚动布局
  理由：
    - 开箱即用，无需手动监听滚动事件
    - 自动高亮当前锚点
    - 支持平滑滚动动画
    - 锚点栏和主内容区分别独立滚动，互不干扰
  实施要点：
    - 外层容器：display: flex, flex-direction: row, height: 100%
    - 左侧锚点栏：width: 200px, flex-shrink: 0, overflow-y: auto, min-height: 0（独立滚动）
    - 右侧内容区使用 ref 获取 DOM 元素：const scrollContainer = ref<HTMLElement>()
    - 右侧内容区：flex: 1, overflow-y: auto, min-height: 0（跟随上级div高度，独立滚动）
    - <el-anchor :container="scrollContainer" :offset="80">
    - 每个内容块使用 <section id="config-management"> 定义锚点
    - <el-anchor-link href="#config-management" title="配置管理">
  反模式：
    ❌ 不要用 window 作为滚动容器（无法限制滚动区域）
    ❌ 不要手动 scrollIntoView（Element Plus 已处理）
    ❌ 不要使用虚拟滚动（过度复杂化）
    ❌ 不要使用固定高度（应使用 min-height: 0 让 flex 子元素正确滚动）

决策点 3：表单参数如何实时保存？
  选择：watch + debounce 500ms + 失焦立即保存 + 自动调用 IPC
  理由：
    - 防止频繁保存造成文件 I/O 抖动
    - 用户体验流畅（无需点击保存按钮）
    - 500ms 延迟足够捕获连续输入
    - 失焦立即保存确保用户离开输入框时数据已保存
  实施要点：
    - 使用 lodash-es/debounce 或 Quasar debounce 工具
    - watch 监听 currentConfig.params，deep: true，防抖 500ms
    - 监听输入框 @blur 事件，失焦时立即调用保存（取消防抖，直接保存）
    - 保存前检查 currentConfig 是否为 null
    - 保存失败时 Notify 提示，但不回滚数据（避免用户输入丢失）
  反模式：
    ❌ 不要每次输入立即保存（I/O 开销大）
    ❌ 不要仅依赖防抖保存（用户可能快速切换输入框，导致数据未保存）
    ❌ 不要保存失败时回滚数据（会导致用户输入丢失）

决策点 4：定位按钮的功能如何占位？
  选择：按钮仅调用 console.log，样式完整实现
  理由：
    - 当前任务范围仅 UI 搭建，实际定位功能后续实现
    - 占位按钮避免后期调整布局
  实施要点：
    - 按钮文本："定位"
    - 点击事件：handleLocate('inputField') → console.log('定位输入栏')
    - 按钮样式：<q-btn flat dense icon="gps_fixed" color="primary">
    - 位置：在输入框右侧，使用 Flex 布局对齐
  反模式：
    ❌ 不要隐藏按钮（后期难以测试布局）
    ❌ 不要添加假的定位逻辑（违反"不做假"原则）

决策点 5：配置卡片如何实现固定高度与滚动？
  选择：max-height + overflow-y: auto
  理由：
    - 配置数量不定，固定高度避免页面过长
    - 内部滚动保证可访问性
  实施要点：
    - 配置管理卡片：max-height: 300px
    - 自动化配置卡片：max-height: 400px
    - 使用 Quasar QScrollArea 组件（提供美化的滚动条）
    - 或直接使用 CSS：overflow-y: auto; scrollbar-width: thin;
  反模式：
    ❌ 不要用固定 height（内容少时浪费空间）
    ❌ 不要隐藏滚动条（用户无法感知可滚动）

决策点 6：如何在 Navbar 中添加分割线？
  选择：在 nav-group-bottom 前插入 <q-separator>
  理由：
    - Quasar 提供的分割线组件语义清晰
    - 样式与现有 UI 一致
  实施要点：
    - 在 template 中插入：
      ```vue
      <div class="nav-group-top">...</div>
      <q-separator class="nav-separator" />
      <div class="nav-group-bottom">...</div>
      ```
    - 样式：.nav-separator { margin: 8px 10px; background-color: #ddd; }
  反模式：
    ❌ 不要用 border（需要额外的占位元素）
    ❌ 不要用 margin 撑开（视觉不明显）
```

---

## 🧪 第六部分：验收标准

```
功能验收：
  ✓ Navbar 底部显示 Settings 选项，图标为 "settings"，点击跳转到 /settings 路由
  ✓ Settings 页面左侧显示 Element Plus 锚点导航，包含"配置管理"和"自动化配置"两个链接
  ✓ 点击锚点链接，右侧内容区平滑滚动到对应卡片，当前锚点高亮
  ✓ 配置管理卡片显示所有配置列表（初始为空），点击"新建"按钮创建配置，输入名称后生成文件
  ✓ 选中配置后，自动化配置表单显示该配置的参数，字段包括：输入栏定位、蓝图位置定位、字符输入速度、显示器序号
  ✓ 修改表单字段，500ms 后自动保存到本地配置文件，输入框失焦时立即保存，无需点击保存按钮
  ✓ 删除配置时弹出确认对话框，确认后删除文件并刷新列表
  ✓ 重命名配置时双击名称进入编辑模式，失焦后保存新名称（不改变文件名）
  ✓ 定位按钮点击时打印日志到控制台，无实际定位功能（占位）

界面验收：
  ✓ Navbar 分割线显示在 top 组与 bottom 组之间，宽度为 40px（nav 宽度 60px，左右各留 10px）
  ✓ Settings 页面左侧锚点栏宽度固定 200px，右侧内容区占满剩余空间
  ✓ 左侧锚点栏和右侧内容区分别独立滚动（overflow-y: auto, min-height: 0）
  ✓ 右侧内容区设置 padding: 24px，内容溢出时显示滚动条
  ✓ 配置管理卡片高度最大 300px，配置超过 5 个时显示内部滚动条
  ✓ 自动化配置卡片高度最大 400px，表单内容超出时显示内部滚动条
  ✓ 横向模式选择器使用圆角样式（border-radius: 8px），初始仅显示"手动配置"选项
  ✓ 字符输入速度使用 QInput type="number"，显示单位"ms"，范围限制 10-1000

数据验收：
  ✓ 新建配置时生成的文件名格式为 {name}-{4位哈希}.json，存储在 {userData}/Data/AutomationConfigs/
  ✓ 配置文件内容包含 id, name, version, mode, params, createdAt, updatedAt 字段
  ✓ 默认配置参数：inputFieldPosition: {x:0, y:0}, firstBlueprintPosition: {x:0, y:0}, charInputDelay: 100, displayIndex: null
  ✓ 修改表单后 500ms，配置文件的 updatedAt 字段更新为当前时间戳
  ✓ 删除配置后，对应的 .json 文件从文件系统中移除
  ✓ 重命名配置后，文件内容的 name 字段更新，但文件名（ID）不变

边界条件验收：
  ✓ 配置目录不存在时，首次保存配置自动创建 AutomationConfigs 目录
  ✓ 配置列表为空时，显示"暂无配置，点击新建按钮创建"占位文本
  ✓ 配置文件损坏（JSON 解析失败）时，该配置不显示在列表中，控制台打印错误日志
  ✓ 当前编辑的配置被删除时，表单区域显示"请选择一个配置"占位文本
  ✓ 字符输入速度输入非法值（<10 或 >1000）时，QInput 显示错误提示，保存时自动截断到范围内
  ✓ 快速切换配置时（点击多个配置卡片），仅加载最后一次点击的配置，中间请求取消（通过 AbortController）
  ✓ 网络断开或文件系统只读时，保存失败显示 Notify 错误提示："保存失败：{错误信息}"
```

---

## 🗂️ 第七部分：文件结构与命名

```
文件树（新增文件）：
SatisfactoryBlueprintManager/
├── Frontend/
│   ├── GUI/
│   │   ├── pages/
│   │   │   └── MainWindow/
│   │   │       ├── MainPanel/
│   │   │       │   └── Settings/                                [新增目录]
│   │   │       │       ├── Index.vue                            [新增] Settings 页面主入口
│   │   │       │       ├── components/
│   │   │       │       │   ├── ConfigManagerCard.vue           [新增] 配置管理卡片
│   │   │       │       │   ├── AutomationConfigCard.vue        [新增] 自动化配置卡片
│   │   │       │       │   └── ManualConfigForm.vue            [新增] 手动配置表单
│   │   │       │       └── types.ts                             [新增] Settings 专用类型
│   │   │       │       └── stores/                              [新增目录]
│   │   │       │           └── AutomationConfig/                [新增目录]
│   │   │       │               ├── index.ts                     [新增] AutomationConfigStore
│   │   │       │               └── types.ts                     [新增] Store 专用类型
│   │   │       └── Shell/
│   │   │           └── MainWindow.Navbar/
│   │   │               └── index.vue                            [修改] 新增 Settings 导航项与分割线
│   └── public/
│       └── types/
│           └── automation-config/                               [新增目录]
│               └── index.ts                                     [新增] 跨层级类型（Frontend + Electron）
├── src-electron/
│   └── Service/
│       └── AutomationConfig/                                    [新增目录]
│           └── file-service.ts                                  [新增] 配置文件服务类
└── {userData}/Data/AutomationConfigs/                          [运行时创建]
    └── {configId}.json                                          [用户创建的配置文件]

路由配置（需修改）：
- 文件：Frontend/GUI/router/index.ts
- 新增路由：
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@gui/pages/MainWindow/MainPanel/Settings/Index.vue')
  }
```

---

## 📝 第八部分：TypeScript 类型约束（ESLint 合规）

```typescript
// ===== 强制规范 =====

// ✅ 使用 type imports（ESLint 规则：@typescript-eslint/consistent-type-imports）
import type { AutomationConfigMeta, AutomationConfigData } from '@types/automation-config'

// ❌ 禁止直接 import（会被 ESLint 报错）
import { AutomationConfigMeta } from '@types/automation-config'

// ✅ Props 使用 interface 定义（ESLint 推荐）
interface ManualConfigFormProps {
  modelValue: ManualConfigParams
}

// ✅ Emits 使用 interface 定义（ESLint 推荐）
interface ManualConfigFormEmits {
  (e: 'update:modelValue', value: ManualConfigParams): void
}

// ✅ 组件 setup 中严格类型标注
const props = defineProps<ManualConfigFormProps>()
const emit = defineEmits<ManualConfigFormEmits>()

// ✅ 避免使用 any（除非绝对必要，需加注释说明）
const handleError = (error: unknown) => {  // 使用 unknown 替代 any
  if (error instanceof Error) {
    console.error(error.message)
  }
}

// ✅ 异步函数必须显式返回类型
async function loadConfig(id: string): Promise<void> {  // 明确 Promise<void>
  // ...
}

// ✅ Ref 类型必须显式标注（避免推断为 any）
const scrollContainer = ref<HTMLElement>()  // 不是 ref()

// ✅ 可选属性使用 ? 而非 | undefined
interface ConfigMeta {
  id: string
  name?: string  // 而非 name: string | undefined
}
```

---

## 🎯 第九部分：实施优先级与分阶段交付

```
阶段 1：基础框架搭建（优先级 P0，预计 2 小时）
  1. 创建文件结构（所有目录和空文件）
  2. 定义所有 TypeScript 类型（public/types/automation-config/index.ts，使用 @types 别名导入）
  3. 实现 AutomationConfigService（复制 ConfigFileService 逻辑，修改目录名）
  4. 配置 IPC 通道（preload.ts + main/index.ts）
  5. 创建 AutomationConfigStore（空实现，仅 state 定义，位置：Settings/stores/AutomationConfig/）
  验收：类型检查通过，IPC 通道注册成功

阶段 2：Navbar 与路由扩展（优先级 P0，预计 30 分钟）
  1. 修改 MainWindowNavbarStore，bottomNavItems 添加 Settings
  2. 修改 MainWindow.Navbar/index.vue，添加 <q-separator>
  3. 添加路由配置：/settings → Settings/Index.vue
  验收：点击 Settings 导航项，页面跳转成功

阶段 3：Settings 页面布局（优先级 P0，预计 1 小时）
  1. 实现 Settings/Index.vue 左右栏布局
  2. 集成 Element Plus Anchor（安装依赖，配置 container）
  3. 创建两个空卡片占位（ConfigManagerCard、AutomationConfigCard）
  验收：锚点导航与内容区联动正常，滚动高亮正确

阶段 4：配置管理卡片（优先级 P1，预计 2 小时）
  1. 实现 ConfigManagerCard.vue（列表渲染、新建、删除、重命名）
  2. 实现 Store.loadConfigList、createConfig、deleteConfig、renameConfig
  3. 连接 IPC 调用（调试日志）
  验收：可创建配置、删除配置、重命名配置，文件系统同步正确

阶段 5：自动化配置表单（优先级 P1，预计 2 小时）
  1. 实现 AutomationConfigCard.vue（横向模式选择器）
  2. 实现 ManualConfigForm.vue（四个字段：输入栏定位、蓝图位置定位、字符输入速度、显示器序号 + 定位按钮占位）
  3. 实现 Store.loadConfig、updateConfigParams + watch 防抖保存 + @blur 失焦保存
  验收：修改表单字段，500ms 后文件内容更新，输入框失焦时立即保存，控制台无错误

阶段 6：边界条件与错误处理（优先级 P2，预计 1 小时）
  1. 添加所有空状态占位（无配置、未选中配置、加载失败）
  2. 添加错误 Notify 提示（保存失败、删除失败等）
  3. 添加输入校验（字符输入速度范围限制）
  验收：所有边界条件测试通过

总预计时间：8.5 小时
```

---

## 🔍 第十部分：潜在风险与缓解措施

```
风险 1：Element Plus Anchor 与 Quasar 样式冲突
  可能性：中
  影响：Anchor 组件显示异常或无法高亮
  缓解措施：
    - 在 Settings/Index.vue 中使用 scoped 样式隔离
    - 如果冲突严重，考虑使用 Quasar QScrollArea + 手动高亮逻辑
    - 备用方案：使用纯 CSS 实现锚点导航（Intersection Observer API）

风险 2：配置文件频繁保存导致文件系统 I/O 瓶颈
  可能性：低（仅当用户疯狂修改表单时）
  影响：保存延迟，文件写入失败
  缓解措施：
    - 防抖延迟从 500ms 增加到 1000ms（如果出现问题）
    - 保存前检查上次保存是否完成（避免并发写入）
    - 使用文件锁机制（fs-ext 库）防止多进程冲突

风险 3：配置文件名哈希冲突
  可能性：极低（4 位哈希 + 时间戳）
  影响：覆盖已有配置
  缓解措施：
    - 生成 ID 时检查文件是否存在，如果存在则重新生成（最多重试 3 次）
    - 哈希算法改为 8 位（如果 4 位出现冲突）

风险 4：用户快速切换配置时，IPC 调用未完成导致数据混乱
  可能性：中
  影响：表单显示错误的配置数据
  缓解措施：
    - 使用 AbortController 取消未完成的 loadConfig 请求
    - 在 Store 中记录请求序列号，仅处理最新请求的响应
    - 切换配置时立即清空 currentConfig（显示加载状态）

风险 5：配置文件 JSON 解析失败导致应用崩溃
  可能性：低（用户手动修改文件时）
  影响：配置列表无法加载
  缓解措施：
    - 所有 JSON.parse 使用 try-catch 包裹
    - 解析失败时记录日志，跳过该配置（不中断列表加载）
    - 提供"修复配置文件"工具（备用功能）
```

---

**设计方案输出完毕！** 🎉

Boss，这个设计方案已经完整覆盖了你的所有需求：

1. ✅ **Navbar 扩展**：新增 Settings 导航项 + 分割线，底部对齐
2. ✅ **Settings 页面布局**：左侧锚点 + 右侧长页面滚动
3. ✅ **配置管理**：增删改选，基于独立配置文件（AppData/Data/AutomationConfigs/）
4. ✅ **手动配置表单**：输入栏定位 + 蓝图位置定位 + 字符输入速度
5. ✅ **实时保存**：防抖 500ms 自动保存到本地文件
6. ✅ **固定高度卡片**：配置管理 300px，自动化配置 400px

所有接口定义、数据流、状态机、实施要点都已详细说明，可以直接交给执行者按步骤实现。你现在处于 **ask mode**，如果需要我编写完整代码，请切换到 **agent mode**，我会立即开始实施！👨‍💻