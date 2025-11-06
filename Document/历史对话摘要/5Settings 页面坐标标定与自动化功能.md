# Settings 页面坐标标定与自动化功能 - 完整技术总结

## 📂 涉及的所有文件（完整路径）

### ✏️ 编辑/创建的文件（30+个）

#### 类型定义文件
- `SatisfactoryBlueprintManager/public/types/automation-config/calibration.ts` - 新建，定义 `CalibrationResult` 和 `CalibrationType` 接口
- `SatisfactoryBlueprintManager/public/types/automation-config/index.ts` - 修改，添加 `AutomationTestResult`、`DisplayInfo` 接口

#### 后端服务文件
- `SatisfactoryBlueprintManager/src-electron/Service/Calibration/ScreenCapture.ts` - 新建，截图捕获模块
- `SatisfactoryBlueprintManager/src-electron/Service/Calibration/OverlayTemplate.ts` - 新建，内联 HTML 模板模块
- `SatisfactoryBlueprintManager/src-electron/Service/Calibration/index.ts` - 新建，标定服务核心逻辑
- `SatisfactoryBlueprintManager/src-electron/Service/Automation/AutomationExecutor.ts` - 修改，从 `@nut-tree/nut-js` → `robotjs` → Python Flask 服务
- `SatisfactoryBlueprintManager/src-electron/Service/PythonServiceManager.ts` - 新建，Python Flask 服务生命周期管理

#### IPC 通信层
- `SatisfactoryBlueprintManager/src-electron/Ipc/AutomationConfigHandler.ts` - 修改，添加标定、测试、显示器信息 IPC 处理器
- `SatisfactoryBlueprintManager/src-electron/Preload/automation-config.ts` - 修改，扩展 preload API
- `SatisfactoryBlueprintManager/src-electron/Preload/overlay.ts` - 新建（后删除），overlay 窗口 preload

#### 前端组件
- `SatisfactoryBlueprintManager/Frontend/GUI/pages/MainWindow/MainPanel/Settings/components/ManualConfigForm.vue` - 修改，添加标定功能、集成 `DisplaySelector`
- `SatisfactoryBlueprintManager/Frontend/GUI/pages/MainWindow/MainPanel/Settings/components/AutomationDebugCard.vue` - 新建，自动化测试卡片
- `SatisfactoryBlueprintManager/Frontend/GUI/pages/MainWindow/MainPanel/Settings/components/DisplaySelector.vue` - 新建，显示器可视化选择器
- `SatisfactoryBlueprintManager/Frontend/GUI/pages/MainWindow/MainPanel/Settings/Index.vue` - 修改，添加自动化测试卡片区域

#### Store 文件
- `SatisfactoryBlueprintManager/Frontend/GUI/pages/MainWindow/MainPanel/Settings/stores/AutomationConfig/index.ts` - 修改，扩展类型定义

#### Python 后端文件
- `SatisfactoryBlueprintManager/Backend/Python/app.py` - 新建，Flask 主应用
- `SatisfactoryBlueprintManager/Backend/Python/automation_executor.py` - 新建，pywinauto 封装
- `SatisfactoryBlueprintManager/Backend/Python/validators.py` - 新建，请求参数验证
- `SatisfactoryBlueprintManager/Backend/Python/requirements.txt` - 新建，Python 依赖
- `SatisfactoryBlueprintManager/Backend/Python/.gitignore` - 新建，Git 忽略规则
- `SatisfactoryBlueprintManager/Backend/Python/README.md` - 新建，使用文档

#### 构建脚本
- `SatisfactoryBlueprintManager/Script/build-python-service.mjs` - 新建，Python 服务构建脚本

#### 配置文件
- `SatisfactoryBlueprintManager/package.json` - 修改，添加 `build:python` 脚本，依赖变更（`@nut-tree/nut-js` → `robotjs` → 移除）
- `SatisfactoryBlueprintManager/quasar.config.ts` - 修改，添加 overlay preload、Python exe 打包配置

#### 主进程文件
- `SatisfactoryBlueprintManager/src-electron/electron-main.ts` - 修改，集成 Python 服务启动/停止

#### 设计文档
- `SatisfactoryBlueprintManager/Document/DesianAndPlan/自动化操作gui搭建/位置选取.md` - 修改，简化坐标处理方案

### 📖 参与讨论但未修改的文件
- `SatisfactoryBlueprintManager/Document/历史对话摘要/4 Settings 页面 UI 改动完整分析.md` - 参考
- `SatisfactoryBlueprintManager/Document/DesianAndPlan/自动化操作gui搭建/技术栈设计.md` - 参考

### 🗑️ 已删除的文件
- `SatisfactoryBlueprintManager/src-electron/windows/overlay.html` - 删除，改为内联到 TypeScript
- `SatisfactoryBlueprintManager/src-electron/windows/overlay.js` - 删除，改为内联到 TypeScript

---

## 🎯 主要完成的工作

### 阶段1：坐标标定功能设计（第500-1200行）
- 输出技术设计方案（按 `make-a-detail-plan` 规范）
- 定义模块划分、接口、数据流、决策点、验收标准
- 讨论 DPI 缩放与坐标处理方案

### 阶段2：坐标处理方案简化（第1200-1800行）
- 用户决策：直接记录物理坐标，不做复杂 DPI 适配
- 更新设计文档：简化 `CalibrationResult` 接口
- 更新决策点3：坐标计算逻辑简化

### 阶段3：坐标标定功能实现（第1800-4000行）
- 创建类型定义：`calibration.ts`
- 创建截图捕获模块：`ScreenCapture.ts`
- 创建标定服务：`CalibrationService`
- 创建 overlay 窗口：HTML + JS + Preload
- 扩展 IPC 通信层
- 前端集成：`ManualConfigForm.vue` 添加标定功能

### 阶段4：路径问题修复（第4000-5000行）
- 问题：`ERR_FILE_NOT_FOUND`，overlay.html 路径错误
- 修复1：路径从 `../windows` 改为 `../../windows`
- 修复2：添加 `extendFilesToCopy` 配置
- 修复3：添加 overlay preload 到构建配置

### 阶段5：HTML 内联方案（第5000-5800行）
- 问题：文件路径在开发/生产环境不一致
- 方案：将 HTML 内联到 TypeScript 模块
- 创建 `OverlayTemplate.ts`，使用 `data:` URL 加载
- 删除 `overlay.html` 和 `overlay.js`

### 阶段6：自动化测试卡片与显示器可视化（第5800-8700行）
- 设计：自动化测试卡片 + 显示器可视化选择器
- 创建 `AutomationDebugCard.vue`
- 创建 `DisplaySelector.vue`（SVG 矩形布局）
- 创建 `AutomationExecutor.ts`（使用 `@nut-tree/nut-js`）
- 扩展 IPC：`executeTest`、`getDisplaysInfo`

### 阶段7：自动化库替换（第8700-15200行）
- 问题：`@nut-tree/nut-js` 安装失败（npm 404）
- 替换为 `robotjs`
- 修改 `AutomationExecutor.ts`：API 调用方式变更

### 阶段8：Python Flask 后端方案（第15200-18200行）
- 决策：使用 Python Flask + pywinauto 替代 `robotjs`
- 创建 Python Flask 服务：`app.py`、`automation_executor.py`、`validators.py`
- 创建构建脚本：`build-python-service.mjs`
- 创建服务管理器：`PythonServiceManager.ts`
- 集成到 Electron：启动/停止生命周期
- 修改 `AutomationExecutor.ts`：通过 HTTP 调用 Python 服务
- 配置打包：`quasar.config.ts` 添加 `extraResources`

### 阶段9：构建脚本问题修复（第18200-19030行）
- 问题1：`uv pip install --requirements.txt` 命令格式错误
- 修复：改为 `uv pip install -r requirements.txt`
- 问题2：`await import('fs')` 语法错误
- 修复：在文件顶部导入 `statSync`
- 问题3：`pyinstaller` 命令找不到
- 修复：使用虚拟环境 Python：`.venv\Scripts\python.exe -m PyInstaller`
- 问题4：目标目录不存在
- 修复：复制前强制创建目录
- 问题5：开发环境 exe 路径错误
- 修复：`app.getAppPath()` 向上两级到源码根目录

---

## 🔑 核心代码片段

### 1. 坐标标定服务核心逻辑

```typescript
// src-electron/Service/Calibration/index.ts
async startCalibration(type: CalibrationType, mainWindow: BrowserWindow): Promise<void> {
  // 1. 隐藏主窗口
  mainWindow.hide()
  
  // 2. 捕获所有显示器截图
  const screenshots = await screenCapture.captureAllDisplays()
  
  // 3. 为每个显示器创建叠加窗口
  const displays = screen.getAllDisplays()
  for (let i = 0; i < displays.length; i++) {
    const overlayWindow = await this.createOverlayWindow(displays[i], screenshots[i])
    this.overlayWindows.push(overlayWindow)
  }
  
  // 4. 设置 IPC 监听
  ipcMain.once('calibration:click', this.handleOverlayClick.bind(this))
  ipcMain.once('calibration:cancel', this.cleanup.bind(this))
}

private handleOverlayClick(event: IpcMainEvent, clickX: number, clickY: number): void {
  // 计算物理坐标
  const logicalX = clickX + display.bounds.x
  const logicalY = clickY + display.bounds.y
  const physicalX = Math.round(logicalX * display.scaleFactor)
  const physicalY = Math.round(logicalY * display.scaleFactor)
  
  // 发送结果到前端
  event.sender.send('calibration:result', {
    x: physicalX,
    y: physicalY,
    displayIndex: displayIndex,
    timestamp: Date.now()
  })
  
  this.cleanup()
}
```

### 2. HTML 内联模板

```typescript
// src-electron/Service/Calibration/OverlayTemplate.ts
export function getOverlayHTML(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    /* CSS 样式 */
  </style>
</head>
<body>
  <img id="screenshot" alt="屏幕截图" />
  <div id="overlay">
    <div id="crosshair"></div>
    <div id="hint">点击屏幕标定坐标，按 ESC 取消</div>
  </div>
  <script>
    // JavaScript 逻辑
  </script>
</body>
</html>`
}

// 使用 data URL 加载
const htmlContent = getOverlayHTML()
await overlayWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)
```

### 3. Python Flask 服务

```python
# Backend/Python/app.py
from flask import Flask, request, jsonify
from automation_executor import AutomationExecutor

app = Flask(__name__)
executor = AutomationExecutor()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "version": "1.0.0"}), 200

@app.route('/api/execute', methods=['POST'])
def execute_automation():
    data = request.json
    action = data.get('action')
    params = data.get('params', {})
    
    if action == 'mouseClick':
        executor.click_mouse(params['x'], params['y'], params.get('button', 'left'))
    elif action == 'typeText':
        executor.type_text(params['text'], params.get('delay', 0.01))
    
    return jsonify({"success": True, "message": "操作完成"}), 200
```

### 4. Python 服务管理器

```typescript
// src-electron/Service/PythonServiceManager.ts
class PythonServiceManager {
  private getExePath(): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'automation-service', this.exeName)
    } else {
      // 开发环境：从 .quasar/dev-electron 向上两级到源码根目录
      return path.join(app.getAppPath(), '..', '..', 'public', 'automation-service', this.exeName)
    }
  }
  
  async start(): Promise<void> {
    const exePath = this.getExePath()
    this.process = spawn(exePath, [], {
      cwd: path.dirname(exePath),
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    
    // 健康检查轮询
    await this.waitForServiceReady()
  }
}
```

### 5. 显示器可视化选择器

```vue
<!-- DisplaySelector.vue -->
<template>
  <div class="display-selector">
    <svg :width="svgWidth" :height="svgHeight" class="display-svg">
      <rect
        v-for="rect in layoutRects"
        :key="rect.displayIndex"
        :x="rect.x"
        :y="rect.y"
        :width="rect.width"
        :height="rect.height"
        :class="{ 'selected': rect.isSelected, 'primary': rect.isPrimary }"
        @click="handleDisplayClick(rect.displayIndex)"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
function calculateLayout(displays: DisplayInfo[], selectedIndex: number | null): DisplayLayoutRect[] {
  // 计算矩形布局，选中的显示器放大 1.3 倍
  const scaleFactor = isSelected ? 1.3 : 1
  // ... 布局计算逻辑
}
</script>
```

### 6. 构建脚本核心逻辑

```javascript
// Script/build-python-service.mjs
const VENV_PYTHON = join(PYTHON_DIR, '.venv', 'Scripts', 'python.exe')

function buildWithPyInstaller() {
  const command = [
    `"${VENV_PYTHON}"`,
    '-m PyInstaller',
    '--onefile',
    '--noconsole',
    `--name=${EXE_NAME.replace('.exe', '')}`,
    '--hidden-import=pywinauto',
    'app.py'
  ].join(' ')
  
  execCommand(command, { cwd: PYTHON_DIR })
}

function copyExeToPublic() {
  // 确保目标目录存在
  mkdirSync(OUTPUT_DIR, { recursive: true })
  
  // 清理旧文件
  if (existsSync(targetExe)) {
    rmSync(targetExe, { force: true })
  }
  
  // 复制新文件
  copyFileSync(sourceExe, targetExe)
}
```

---

## 🔌 使用的 API/方法/接口清单

### Electron API
- `desktopCapturer.getSources()` - 截图捕获
- `screen.getAllDisplays()` - 获取所有显示器信息
- `BrowserWindow` - 创建叠加窗口
- `ipcMain.handle()` / `ipcRenderer.invoke()` - 请求-响应 IPC
- `ipcMain.send()` / `ipcRenderer.on()` - 事件推送 IPC
- `app.getAppPath()` - 获取应用路径
- `process.resourcesPath` - 生产环境资源路径
- `child_process.spawn()` - 启动 Python 进程

### Python API
- `pywinauto.mouse.move()` / `mouse.click()` - 鼠标控制
- `pywinauto.keyboard.send_keys()` - 键盘输入
- `Flask` - HTTP 服务器
- `PyInstaller` - 打包工具

### 前端 API
- `window.electron.automationConfigAPI.startCalibration()` - 启动标定
- `window.electron.automationConfigAPI.executeTest()` - 执行测试
- `window.electron.automationConfigAPI.getDisplaysInfo()` - 获取显示器信息

---

## 📐 项目规范与习惯

### 1. 坐标系统规范
- 直接存储物理坐标（设备像素），不做 DPI 动态转换
- 用户标定即为当前环境定制，环境变化需重新标定
- 坐标计算：逻辑坐标 → 物理坐标（乘以 `scaleFactor`）

### 2. 文件路径规范
- 开发环境：从 `.quasar/dev-electron` 向上两级到源码根目录
- 生产环境：使用 `process.resourcesPath`
- HTML 文件：优先内联到 TypeScript，避免路径问题

### 3. IPC 通信规范
- 请求-响应：使用 `invoke/handle`
- 事件推送：使用 `send/on`
- 标定流程：混合模式（invoke 启动 + send 推送结果）

### 4. Python 服务规范
- 使用虚拟环境：`.venv\Scripts\python.exe`
- 构建脚本：使用 `-m PyInstaller` 而非直接命令
- 单线程模式：`threaded=False`，避免并发冲突

### 5. 错误处理规范
- 路径检查：启动前检查文件是否存在
- 健康检查：指数退避轮询，最多 10 秒超时
- 进程管理：优雅退出（SIGTERM → 等待 5 秒 → SIGKILL）

---

## ⚠️ 踩的坑与经验总结

### 坑1：overlay.html 路径解析错误
问题：`ERR_FILE_NOT_FOUND`，尝试加载 `.quasar/windows/overlay.html`  
原因：`currentDir` 指向 `Service/Calibration/`，路径计算错误  
解决：
1. 路径改为 `../../windows/overlay.html`（上两级）
2. 最终方案：HTML 内联到 TypeScript，使用 `data:` URL  
经验：避免在 Electron 中处理 HTML 文件路径，优先内联

### 坑2：DPI 缩放坐标转换混淆
问题：设计文档中坐标转换逻辑错误  
原因：混用逻辑坐标和物理坐标  
解决：简化方案，直接存储物理坐标  
经验：Keep It Simple，用户标定即为环境定制

### 坑3：@nut-tree/nut-js 安装失败
问题：npm 404 错误，包不存在  
原因：包名或版本错误  
解决：替换为 `robotjs`，最终改为 Python Flask 方案  
经验：优先选择成熟稳定的库，避免使用 beta 版本

### 坑4：构建脚本语法错误
问题：`await import('fs')` 在非 async 函数中使用  
原因：动态导入语法错误  
解决：在文件顶部导入 `statSync`  
经验：ESM 模块中，动态导入需在 async 函数中

### 坑5：uv pip 命令格式错误
问题：`uv pip install --requirements.txt` 报错  
原因：参数格式错误，应为 `-r requirements.txt`  
解决：使用 `uv pip install -r requirements.txt`  
经验：注意命令行参数格式，`-r` 是简写，`--requirements` 需要空格

### 坑6：PyInstaller 命令找不到
问题：`pyinstaller` 不是内部或外部命令  
原因：虚拟环境中的包未添加到 PATH  
解决：使用 `python -m PyInstaller` 或虚拟环境 Python 路径  
经验：虚拟环境中的包应通过 `python -m` 调用

### 坑7：开发环境 exe 路径错误
问题：开发环境找不到 `public/automation-service/automation-service.exe`  
原因：`app.getAppPath()` 返回 `.quasar/dev-electron`，不是源码根目录  
解决：向上两级：`path.join(app.getAppPath(), '..', '..', 'public', ...)`  
经验：开发环境路径需要特殊处理，不能假设 `getAppPath()` 返回源码根目录

---

## 🎓 可直接复用的知识

### 1. Electron HTML 内联方案
场景：需要在 Electron 中加载 HTML，但路径处理复杂  
方案：
```typescript
// 1. 创建 TypeScript 模块导出 HTML 字符串
export function getHTML(): string {
  return `<!DOCTYPE html>...`
}

// 2. 使用 data URL 加载
const htmlContent = getHTML()
await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)
```
优点：避免路径问题，统一构建流程

### 2. Python Flask 服务集成到 Electron
场景：需要在 Electron 中调用 Python 自动化库  
方案：
1. 创建 Flask HTTP 服务
2. PyInstaller 打包为单文件 exe
3. Electron 启动时 spawn Python 进程
4. 通过 HTTP 调用 Python API
5. 应用退出时终止 Python 进程

### 3. 显示器可视化布局算法
场景：需要可视化多显示器布局  
方案：
1. 获取所有显示器信息（bounds、scaleFactor）
2. 归一化坐标（找到最小 x、y）
3. 计算 SVG 布局（按比例缩放）
4. 选中显示器放大 1.3 倍并高亮

---

## 🔄 下一步工作

1. 测试 Python Flask 服务在开发/生产环境的启动和通信
2. 验证坐标标定功能在多显示器环境下的准确性
3. 优化显示器可视化选择器的布局算法（支持更多显示器）
4. 添加自动化测试的错误恢复机制
5. 添加坐标标定的历史记录功能
6. 优化 Python 服务的健康检查机制（自动重启）

---

## 📊 数据流图

```
[用户点击定位按钮]
  ↓
[前端调用 startCalibration IPC]
  ↓
[主进程隐藏主窗口]
  ↓
[捕获所有显示器截图]
  ↓
[创建叠加窗口（每个显示器一个）]
  ↓
[用户点击屏幕]
  ↓
[计算物理坐标]
  ↓
[通过 IPC 发送结果到前端]
  ↓
[前端更新表单字段]
  ↓
[清理叠加窗口，显示主窗口]
```

---

## 🎯 架构决策记录（ADR）

### ADR-1：坐标存储策略
决策：直接存储物理坐标，不做 DPI 动态转换  
理由：用户标定即为环境定制，简化实现  
后果：环境变化需重新标定

### ADR-2：HTML 加载方案
决策：HTML 内联到 TypeScript，使用 data URL  
理由：避免开发/生产环境路径差异  
后果：HTML 代码在 TypeScript 中，可读性略差

### ADR-3：自动化后端方案
决策：Python Flask + pywinauto，替代 Node.js 库  
理由：pywinauto 在 Windows 上更稳定，避免原生模块编译问题  
后果：需要管理 Python 进程生命周期

---

总结完成。新对话可基于此总结无缝衔接工作。