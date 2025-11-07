/**
 * 快捷键配置服务（Electron 主进程）
 * 负责快捷键的注册、注销和配置持久化
 */
import { promises as fs } from 'fs'
import path from 'path'
import { app, globalShortcut, BrowserWindow } from 'electron'
import type { ShortcutConfig } from '../../../public/types/shortcut-config'

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
function registerShortcuts(config: ShortcutConfig, mainWindow: BrowserWindow | null): boolean {
  if (!mainWindow) {
    console.warn('Cannot register shortcuts: mainWindow is null')
    return false
  }

  // 先注销所有快捷键
  globalShortcut.unregisterAll()

  // 注册窗口切换快捷键
  const success = globalShortcut.register(config.toggleWindow, () => {
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

  if (!success) {
    console.error(`Failed to register shortcut: ${config.toggleWindow}`)
  }

  return success
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
    registerShortcuts(config, this.mainWindow)
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
    registerShortcuts(config, this.mainWindow)
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

