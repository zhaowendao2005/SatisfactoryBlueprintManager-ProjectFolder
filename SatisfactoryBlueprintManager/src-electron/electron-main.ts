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
import { registerGlobalTagsHandlers } from './Ipc/GlobalTagsHandler'
import { registerSyncHandlers } from './Ipc/SyncHandler'
import { registerAutomationConfigHandlers } from './Ipc/AutomationConfigHandler'
import { registerBlueprintInfoHandlers } from './Ipc/BlueprintInfoHandler'
import { registerShortcutHandlers } from './Ipc/ShortcutHandler'
import { registerGeneralSettingsHandlers } from './Ipc/GeneralSettingsHandler'
import { registerQuickAccessHandlers } from './Ipc/QuickAccessHandler'
import { shortcutService } from './Service/Shortcut/ShortcutService'
import { pythonServiceManager } from './Service/PythonServiceManager'
import { trayService } from './Service/Tray/TrayService'
import { quickAccessWindowService } from './Service/QuickAccess/QuickAccessWindowService'
import { loggerService } from './Service/Logger/LoggerService'

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
  registerGlobalTagsHandlers()
  registerSyncHandlers()
  registerAutomationConfigHandlers(mainWindow)
  registerBlueprintInfoHandlers()
  registerShortcutHandlers()
  registerGeneralSettingsHandlers(mainWindow)
  registerQuickAccessHandlers(mainWindow)

  // 4. 初始化快捷键服务
  shortcutService.setMainWindow(mainWindow)
  await shortcutService.initialize()

  // 4.5. 创建托盘
  trayService.createTray(mainWindow)

  // 4.6. 创建快速访问窗口（预创建但不显示）
  await quickAccessWindowService.create(mainWindow)

  // 5. 窗口关闭清理
  mainWindow.on('closed', () => {
    mainWindow = undefined
    shortcutService.setMainWindow(null)
    trayService.updateMainWindow(null) // 清理托盘服务的窗口引用
  })
}

/**
 * 应用就绪时初始化日志服务并创建窗口
 */
void app.whenReady().then(async () => {
  // 首先初始化日志服务（必须在应用 ready 后才能获取 userData）
  try {
    await loggerService.initialize()
    console.log('[Main] 日志服务初始化完成')
  } catch (error) {
    console.error('[Main] 日志服务初始化失败:', error)
    // 即使日志服务初始化失败，也继续启动应用
  }
  
  // 然后创建窗口
  await createWindow()
})

/**
 * 所有窗口关闭时的处理
 * 托盘应用模式：窗口关闭不退出，只有从托盘菜单选择"退出"才真正退出
 */
app.on('window-all-closed', () => {
  // macOS: 通常保持应用运行
  // Windows/Linux: 托盘应用也应保持运行
  console.log('[Main] 所有窗口已关闭，应用保持运行（托盘模式）')
  // 不调用 app.quit()，让应用继续在后台运行
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
  
  console.log('[Main] 应用退出中，清理资源...')
  
  // 确保主窗口被销毁（如果还存在）
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.removeAllListeners('close') // 移除可能阻止关闭的监听器
    mainWindow.destroy()
  }
  
  // 注销所有快捷键
  shortcutService.unregisterAll()
  
  // 销毁托盘
  trayService.destroy()
  
  // 销毁快速访问窗口
  quickAccessWindowService.destroy()
  
  try {
    await pythonServiceManager.stop()
    console.log('[Main] Python 服务已停止')
  } catch (error) {
    console.error('[Main] 停止 Python 服务失败:', error)
  } finally {
    // 关闭日志服务
    try {
      await loggerService.close()
      console.log('[Main] 日志服务已关闭')
    } catch (error) {
      console.error('[Main] 关闭日志服务失败:', error)
    }
    
    // 清理完成后退出
    app.exit(0)
  }
})
