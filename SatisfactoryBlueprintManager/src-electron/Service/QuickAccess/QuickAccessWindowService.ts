/**
 * 快速访问窗口服务（Electron 主进程）
 * 负责快速访问窗口的生命周期管理
 */
import { app, BrowserWindow, BrowserWindowConstructorOptions, screen } from 'electron'
import path from 'path'
import { existsSync } from 'fs'
import type { GeneralSettingsConfig } from '../../../public/types/general-settings'
import { generalSettingsFileService } from '../GeneralSettings/file-service'

/**
 * 快速访问窗口配置
 */
interface QuickAccessConfig {
  width: number
  height: number
  alwaysOnTop: boolean
  x?: number
  y?: number
}

/**
 * 快速访问窗口服务（单例）
 */
class QuickAccessWindowService {
  private quickAccessWindow: BrowserWindow | null = null
  private mainWindow: BrowserWindow | null = null
  private config: QuickAccessConfig | null = null

  /**
   * 创建快速访问窗口（不显示）
   */
  async create(mainWindow: BrowserWindow): Promise<void> {
    if (this.quickAccessWindow) {
      console.log('[QuickAccessWindowService] 窗口已存在，跳过创建')
      return
    }

    this.mainWindow = mainWindow

    // 加载配置
    try {
      const settings = await generalSettingsFileService.loadSettings()
      this.config = {
        width: settings.quickAccessWindowSize?.width || 500,
        height: settings.quickAccessWindowSize?.height || 700,
        alwaysOnTop: settings.quickAccessAlwaysOnTop ?? true,
        x: settings.quickAccessWindowSize?.x,
        y: settings.quickAccessWindowSize?.y,
      }
    } catch (error) {
      console.error('[QuickAccessWindowService] 加载配置失败，使用默认配置:', error)
      this.config = {
        width: 500,
        height: 700,
        alwaysOnTop: true,
      }
    }

    // 计算窗口位置（居中或使用保存的位置）
    const { x, y } = this.calculateWindowPosition()

    // 调试：快速访问窗口 preload 路径
    const appPath = app.getAppPath()
    const preloadPath = process.env.QUASAR_ELECTRON_PRELOAD_FOLDER
      ? path.join(  // 使用 app.getAppPath() 访问 asar 内的文件
          appPath,
          process.env.QUASAR_ELECTRON_PRELOAD_FOLDER,
          'electron-preload' + (process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION || '.cjs')
        )
      : path.join(appPath, 'electron-preload.cjs')
    
    console.log('[QuickAccessWindowService] ========== 快速访问窗口路径调试 ==========')
    console.log('[QuickAccessWindowService] preload 路径:', preloadPath)
    console.log('[QuickAccessWindowService] preload 文件存在:', existsSync(preloadPath))
    console.log('[QuickAccessWindowService] ==========================================')

    const windowOptions: BrowserWindowConstructorOptions = {
      width: this.config.width,
      height: this.config.height,
      x,
      y,
      useContentSize: true,
      frame: false, // 使用自定义标题栏
      alwaysOnTop: this.config.alwaysOnTop,
      resizable: true,
      minimizable: false,
      maximizable: false,
      skipTaskbar: true, // 不在任务栏显示
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        // 标准路径方案：开发环境使用 Quasar 环境变量，生产环境使用 app.getAppPath()
        preload: preloadPath,
      },
    }

    this.quickAccessWindow = new BrowserWindow(windowOptions)

    // 加载应用（使用 hash 路由）
    if (process.env.DEV) {
      await this.quickAccessWindow.loadURL(
        `${process.env.APP_URL || 'http://localhost:9300'}#/quick-access`
      )
    } else {
      await this.quickAccessWindow.loadFile('index.html', {
        hash: 'quick-access',
      })
    }

    // 配置 DevTools（仅开发模式）
    if (process.env.DEBUGGING || process.env.DEV) {
      this.quickAccessWindow.webContents.openDevTools({ mode: 'detach' })
    }

    // F12 快捷键控制 DevTools
    this.quickAccessWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12') {
        event.preventDefault()
        if (this.quickAccessWindow) {
          if (this.quickAccessWindow.webContents.isDevToolsOpened()) {
            this.quickAccessWindow.webContents.closeDevTools()
          } else {
            this.quickAccessWindow.webContents.openDevTools({ mode: 'detach' })
          }
        }
      }
    })

    // 监听窗口关闭事件（改为隐藏）
    this.quickAccessWindow.on('close', (event) => {
      event.preventDefault()
      this.hide()
    })

    // 监听窗口位置和尺寸变化，保存配置（使用防抖）
    let positionSaveTimer: NodeJS.Timeout | null = null
    let sizeSaveTimer: NodeJS.Timeout | null = null

    this.quickAccessWindow.on('moved', () => {
      if (positionSaveTimer) {
        clearTimeout(positionSaveTimer)
      }
      positionSaveTimer = setTimeout(() => {
        this.saveWindowPosition().catch((error) => {
          console.error('[QuickAccessWindowService] 保存窗口位置失败:', error)
        })
      }, 500) // 500ms 防抖
    })

    this.quickAccessWindow.on('resized', () => {
      if (sizeSaveTimer) {
        clearTimeout(sizeSaveTimer)
      }
      sizeSaveTimer = setTimeout(() => {
        this.saveWindowSize().catch((error) => {
          console.error('[QuickAccessWindowService] 保存窗口尺寸失败:', error)
        })
      }, 500) // 500ms 防抖
    })

    // 默认隐藏
    this.quickAccessWindow.hide()

    console.log('[QuickAccessWindowService] 快速访问窗口创建成功')
  }

  /**
   * 计算窗口位置
   */
  private calculateWindowPosition(): { x: number; y: number } {
    if (this.config?.x !== undefined && this.config?.y !== undefined) {
      // 使用保存的位置
      return { x: this.config.x, y: this.config.y }
    }

    // 默认居中显示
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize
    const windowWidth = this.config?.width || 500
    const windowHeight = this.config?.height || 700

    return {
      x: Math.floor((width - windowWidth) / 2),
      y: Math.floor((height - windowHeight) / 2),
    }
  }

  /**
   * 保存窗口位置
   */
  private async saveWindowPosition(): Promise<void> {
    if (!this.quickAccessWindow || !this.config) return

    const [x, y] = this.quickAccessWindow.getPosition()
    this.config.x = x
    this.config.y = y

    try {
      const settings = await generalSettingsFileService.loadSettings()
      if (!settings.quickAccessWindowSize) {
        settings.quickAccessWindowSize = { width: 500, height: 700 }
      }
      settings.quickAccessWindowSize.x = x
      settings.quickAccessWindowSize.y = y
      await generalSettingsFileService.saveSettings(settings)
    } catch (error) {
      console.error('[QuickAccessWindowService] 保存窗口位置失败:', error)
    }
  }

  /**
   * 保存窗口尺寸
   */
  private async saveWindowSize(): Promise<void> {
    if (!this.quickAccessWindow || !this.config) return

    const [width, height] = this.quickAccessWindow.getSize()
    this.config.width = width
    this.config.height = height

    try {
      const settings = await generalSettingsFileService.loadSettings()
      if (!settings.quickAccessWindowSize) {
        settings.quickAccessWindowSize = { width: 500, height: 700 }
      }
      settings.quickAccessWindowSize.width = width
      settings.quickAccessWindowSize.height = height
      await generalSettingsFileService.saveSettings(settings)
    } catch (error) {
      console.error('[QuickAccessWindowService] 保存窗口尺寸失败:', error)
    }
  }

  /**
   * 显示窗口
   */
  show(): void {
    if (!this.quickAccessWindow) {
      console.warn('[QuickAccessWindowService] 窗口未创建，无法显示')
      return
    }

    if (this.quickAccessWindow.isVisible()) {
      this.quickAccessWindow.focus()
      return
    }

    this.quickAccessWindow.show()
    this.quickAccessWindow.focus()
  }

  /**
   * 隐藏窗口
   */
  hide(): void {
    if (!this.quickAccessWindow) {
      return
    }

    this.quickAccessWindow.hide()
  }

  /**
   * 切换显示/隐藏
   */
  toggle(): void {
    if (!this.quickAccessWindow) {
      console.warn('[QuickAccessWindowService] 窗口未创建，无法切换')
      return
    }

    if (this.quickAccessWindow.isVisible()) {
      this.hide()
    } else {
      this.show()
    }
  }

  /**
   * 更新配置
   */
  async updateConfig(config: Partial<QuickAccessConfig>): Promise<void> {
    if (!this.config) {
      this.config = {
        width: 500,
        height: 700,
        alwaysOnTop: true,
      }
    }

    Object.assign(this.config, config)

    if (this.quickAccessWindow) {
      if (config.alwaysOnTop !== undefined) {
        this.quickAccessWindow.setAlwaysOnTop(config.alwaysOnTop)
      }
      if (config.width !== undefined || config.height !== undefined) {
        this.quickAccessWindow.setSize(
          config.width || this.config.width,
          config.height || this.config.height
        )
      }
      if (config.x !== undefined && config.y !== undefined) {
        this.quickAccessWindow.setPosition(config.x, config.y)
      }
    }
  }

  /**
   * 销毁窗口
   */
  destroy(): void {
    if (this.quickAccessWindow) {
      this.quickAccessWindow.destroy()
      this.quickAccessWindow = null
      console.log('[QuickAccessWindowService] 快速访问窗口已销毁')
    }
  }

  /**
   * 获取窗口是否可见
   */
  isVisible(): boolean {
    return this.quickAccessWindow?.isVisible() ?? false
  }

  /**
   * 获取窗口实例（用于IPC通信）
   */
  getWindow(): BrowserWindow | null {
    return this.quickAccessWindow
  }
}

export const quickAccessWindowService = new QuickAccessWindowService()

