import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

/**
 * 窗口管理服务
 */
export class WindowService {
  /**
   * 创建主窗口
   */
  static async createMainWindow(): Promise<BrowserWindow> {
    const windowOptions: BrowserWindowConstructorOptions = {
      icon: path.resolve(currentDir, '../../icons/icon.png'),
      width: 1000,
      height: 600,
      useContentSize: true,
      frame: false, // 使用自定义标题栏
      webPreferences: {
        contextIsolation: true,
        // QUASAR_ELECTRON_PRELOAD_FOLDER 是绝对路径，直接使用 path.join
        preload: path.join(
          process.env.QUASAR_ELECTRON_PRELOAD_FOLDER || '',
          'electron-preload' + (process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION || '.cjs')
        ),
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
