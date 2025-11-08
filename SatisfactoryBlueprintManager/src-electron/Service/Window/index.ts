import { app, BrowserWindow, BrowserWindowConstructorOptions } from 'electron'
import path from 'path'
import { existsSync } from 'fs'

/**
 * 窗口管理服务
 */
export class WindowService {
  /**
   * 创建主窗口
   */
  static async createMainWindow(): Promise<BrowserWindow> {
    // 调试：打印路径信息
    const appPath = app.getAppPath()
    // 开发环境：Quasar 已设置正确的绝对路径，直接 resolve
    // 生产环境：从 app.asar 加载
    const preloadPath = process.env.DEV
      ? path.resolve(
          process.env.QUASAR_ELECTRON_PRELOAD_FOLDER || '',
          'electron-preload' + (process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION || '.cjs')
        )
      : path.join(appPath, 'preload', 'electron-preload.cjs')
    const iconPath = path.join(appPath, 'icons', 'icon.png')
    
    console.log('[WindowService] ========== 路径调试信息 ==========')
    console.log('[WindowService] process.env.DEV:', process.env.DEV)
    console.log('[WindowService] app.getAppPath():', appPath)
    console.log('[WindowService] app.isPackaged:', app.isPackaged)
    console.log('[WindowService] process.resourcesPath:', process.resourcesPath)
    console.log('[WindowService] QUASAR_ELECTRON_PRELOAD_FOLDER:', process.env.QUASAR_ELECTRON_PRELOAD_FOLDER)
    console.log('[WindowService] QUASAR_ELECTRON_PRELOAD_EXTENSION:', process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION)
    console.log('[WindowService] preload 路径:', preloadPath)
    console.log('[WindowService] preload 文件存在:', existsSync(preloadPath))
    console.log('[WindowService] icon 路径:', iconPath)
    console.log('[WindowService] icon 文件存在:', existsSync(iconPath))
    console.log('[WindowService] ==========================================')
    
    const windowOptions: BrowserWindowConstructorOptions = {
      icon: iconPath,
      width: 1000,
      height: 600,
      useContentSize: true,
      frame: false, // 使用自定义标题栏
      webPreferences: {
        contextIsolation: true,
        // 标准路径方案：开发环境使用 Quasar 环境变量，生产环境使用 app.getAppPath()
        preload: preloadPath,
      },
    }

    const mainWindow = new BrowserWindow(windowOptions)

    // 加载应用
    if (process.env.DEV) {
      await mainWindow.loadURL(process.env.APP_URL || 'http://localhost:9300')
    } else {
      await mainWindow.loadFile('index.html')
    }

    // 配置 DevTools（仅开发模式）
    if (process.env.DEBUGGING || process.env.DEV) {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
    }

    // F12 快捷键控制 DevTools
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12') {
        event.preventDefault()
        if (mainWindow.webContents.isDevToolsOpened()) {
          mainWindow.webContents.closeDevTools()
        } else {
          mainWindow.webContents.openDevTools({ mode: 'detach' })
        }
      }
    })

    return mainWindow
  }

  /**
   * 创建自定义窗口
   */
  static createWindow(options: BrowserWindowConstructorOptions): BrowserWindow {
    return new BrowserWindow(options)
  }

  /**
   * 最小化窗口
   */
  static minimize(win: BrowserWindow): void {
    win.minimize()
  }

  /**
   * 最大化/还原窗口
   */
  static toggleMaximize(win: BrowserWindow): void {
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  }

  /**
   * 关闭窗口
   */
  static close(win: BrowserWindow): void {
    win.close()
  }
}
