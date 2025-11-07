/**
 * Electron 主进程入口
 * 职责：应用生命周期管理、模块组织
 */
import { app, BrowserWindow } from 'electron'
import os from 'os'
import { WindowService } from './Service/Window'
import { WindowHandler } from './Ipc/WindowHandler'
import { BlueprintHandler } from './Ipc/BlueprintHandler'
import { registerConfigHandlers } from './Ipc/ConfigHandler'
import { registerSyncHandlers } from './Ipc/SyncHandler'
import { registerAutomationConfigHandlers } from './Ipc/AutomationConfigHandler'
import { registerBlueprintInfoHandlers } from './Ipc/BlueprintInfoHandler'
import { pythonServiceManager } from './Service/PythonServiceManager'

const platform = process.platform || os.platform()

let mainWindow: BrowserWindow | undefined

/**
 * 创建主窗口
 */
async function createWindow(): Promise<void> {
  // 1. 启动 Python 自动化服务
  try {
    console.log('[Main] 启动 Python 自动化服务...')
    await pythonServiceManager.start()
    console.log('[Main] Python 自动化服务启动成功')
  } catch (error) {
    console.error('[Main] Python 自动化服务启动失败:', error)
    // 注意：服务启动失败不影响应用启动，仅自动化功能不可用
  }

  // 2. 通过 WindowService 创建主窗口
  mainWindow = await WindowService.createMainWindow()

  // 3. 注册 IPC 处理器
  WindowHandler.register(mainWindow)
  BlueprintHandler.register()
  registerConfigHandlers()
  registerSyncHandlers()
  registerAutomationConfigHandlers(mainWindow)
  registerBlueprintInfoHandlers()

  // 4. 窗口关闭清理
  mainWindow.on('closed', () => {
    mainWindow = undefined
  })
}

/**
 * 应用就绪时创建窗口
 */
void app.whenReady().then(createWindow)

/**
 * 所有窗口关闭时退出应用（macOS 除外）
 */
app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit()
  }
})

/**
 * macOS 激活时重新创建窗口
 */
app.on('activate', () => {
  if (mainWindow === undefined) {
    void createWindow()
  }
})

/**
 * 应用退出前清理
 */
app.on('will-quit', async (event) => {
  // 阻止默认退出
  event.preventDefault()
  
  console.log('[Main] 应用退出中，清理 Python 服务...')
  
  try {
    await pythonServiceManager.stop()
    console.log('[Main] Python 服务已停止')
  } catch (error) {
    console.error('[Main] 停止 Python 服务失败:', error)
  } finally {
    // 清理完成后退出
    app.exit(0)
  }
})
