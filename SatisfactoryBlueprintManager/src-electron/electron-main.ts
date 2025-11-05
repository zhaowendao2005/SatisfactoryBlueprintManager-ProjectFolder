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

const platform = process.platform || os.platform()

let mainWindow: BrowserWindow | undefined

/**
 * 创建主窗口
 */
async function createWindow(): Promise<void> {
  // 通过 WindowService 创建主窗口
  mainWindow = await WindowService.createMainWindow()

  // 注册 IPC 处理器
  WindowHandler.register(mainWindow)
  BlueprintHandler.register()
  registerConfigHandlers()

  // 窗口关闭清理
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
