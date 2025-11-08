/**
 * 快捷键配置服务（Electron 主进程）
 * 负责快捷键的注册、注销和配置持久化
 */
import { promises as fs } from 'fs'
import path from 'path'
import { app, globalShortcut, BrowserWindow } from 'electron'
import type { ShortcutConfig } from '../../../public/types/shortcut-config'
import { generalSettingsFileService } from '../GeneralSettings/file-service'
import { quickAccessWindowService } from '../QuickAccess/QuickAccessWindowService'

const CONFIG_DIR_NAME = 'Data'
const SHORTCUT_CONFIG_FILE = 'ShortcutConfig.json'
const DEFAULT_SHORTCUT = 'CommandOrControl+Shift+B'

/**
 * 获取快捷键配置文件路径
 */
function getShortcutConfigPath(): string {
  const userData = app.getPath('userData')
  return path.join(userData, CONFIG_DIR_NAME, SHORTCUT_CONFIG_FILE)
}

/**
 * 读取快捷键配置
 */
async function readShortcutConfig(): Promise<ShortcutConfig> {
  const filePath = getShortcutConfigPath()
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const config = JSON.parse(content) as ShortcutConfig
    return config
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // 文件不存在，返回默认配置
      return { toggleWindow: DEFAULT_SHORTCUT }
    }
    console.error('Failed to read shortcut config:', error)
    return { toggleWindow: DEFAULT_SHORTCUT }
  }
}

/**
 * 保存快捷键配置
 */
async function saveShortcutConfig(config: ShortcutConfig): Promise<void> {
  const filePath = getShortcutConfigPath()
  const configDir = path.dirname(filePath)
  
  // 确保目录存在
  try {
    await fs.access(configDir)
  } catch {
    await fs.mkdir(configDir, { recursive: true })
  }
  
  const content = JSON.stringify(config, null, 2)
  await fs.writeFile(filePath, content, 'utf-8')
}

/**
 * 注册全局快捷键
 */
async function registerShortcuts(config: ShortcutConfig, mainWindow: BrowserWindow | null): Promise<boolean> {
  if (!mainWindow) {
    console.warn('Cannot register shortcuts: mainWindow is null')
    return false
  }

  // 先注销所有快捷键
  globalShortcut.unregisterAll()

  let allSuccess = true

  // 注册窗口切换快捷键
  const mainWindowSuccess = globalShortcut.register(config.toggleWindow, () => {
    if (!mainWindow) return

    if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
      // 窗口可见，最小化
      mainWindow.minimize()
    } else {
      // 窗口隐藏或最小化，恢复并聚焦
      mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  if (!mainWindowSuccess) {
    console.error(`Failed to register main window shortcut: ${config.toggleWindow}`)
    allSuccess = false
  }

  // 注册快速访问窗口快捷键
  try {
    const generalSettings = await generalSettingsFileService.loadSettings()
    const quickAccessShortcut = generalSettings.quickAccessShortcut || 'CommandOrControl+Shift+Q'
    
    const quickAccessSuccess = globalShortcut.register(quickAccessShortcut, () => {
      quickAccessWindowService.toggle()
    })

    if (!quickAccessSuccess) {
      console.error(`Failed to register quick access shortcut: ${quickAccessShortcut}`)
      allSuccess = false
    } else {
      console.log(`[ShortcutService] 快速访问快捷键已注册: ${quickAccessShortcut}`)
    }
  } catch (error) {
    console.error('[ShortcutService] 注册快速访问快捷键失败:', error)
    allSuccess = false
  }

  return allSuccess
}

/**
 * 验证快捷键格式是否有效
 */
function validateShortcut(shortcut: string): boolean {
  try {
    // 尝试注册并立即注销来验证格式
    const testSuccess = globalShortcut.register(shortcut, () => {})
    if (testSuccess) {
      globalShortcut.unregister(shortcut)
      return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * 快捷键服务类
 */
export class ShortcutService {
  private mainWindow: BrowserWindow | null = null

  /**
   * 设置主窗口引用
   */
  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window
  }

  /**
   * 加载配置并注册快捷键
   */
  async initialize(): Promise<void> {
    const config = await readShortcutConfig()
    await registerShortcuts(config, this.mainWindow)
  }

  /**
   * 加载快捷键配置
   */
  async loadConfig(): Promise<ShortcutConfig> {
    return await readShortcutConfig()
  }

  /**
   * 保存快捷键配置并重新注册
   */
  async saveConfig(config: ShortcutConfig): Promise<void> {
    await saveShortcutConfig(config)
    await registerShortcuts(config, this.mainWindow)
  }

  /**
   * 重新注册快速访问快捷键（当通用设置更新时调用）
   */
  async reregisterQuickAccessShortcut(): Promise<void> {
    const config = await readShortcutConfig()
    await registerShortcuts(config, this.mainWindow)
  }

  /**
   * 验证快捷键格式
   */
  validateShortcut(shortcut: string): boolean {
    return validateShortcut(shortcut)
  }

  /**
   * 注销所有快捷键
   */
  unregisterAll(): void {
    globalShortcut.unregisterAll()
  }
}

export const shortcutService = new ShortcutService()

