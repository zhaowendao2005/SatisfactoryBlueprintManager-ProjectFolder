/**
 * 快捷键配置 IPC 处理器
 */
import { ipcMain } from 'electron'
import { shortcutService } from '../Service/Shortcut/ShortcutService'
import type { ShortcutConfig } from '../../public/types/shortcut-config'

const IPC_CHANNEL_LOAD_SHORTCUT_CONFIG = 'shortcut:load-config'
const IPC_CHANNEL_SAVE_SHORTCUT_CONFIG = 'shortcut:save-config'
const IPC_CHANNEL_VALIDATE_SHORTCUT = 'shortcut:validate'

/**
 * 注册快捷键配置 IPC 处理器
 */
export function registerShortcutHandlers(): void {
  // 加载快捷键配置
  ipcMain.handle(IPC_CHANNEL_LOAD_SHORTCUT_CONFIG, async (): Promise<ShortcutConfig> => {
    try {
      return await shortcutService.loadConfig()
    } catch (error) {
      console.error('Failed to load shortcut config:', error)
      throw error
    }
  })

  // 保存快捷键配置
  ipcMain.handle(IPC_CHANNEL_SAVE_SHORTCUT_CONFIG, async (_event, config: ShortcutConfig): Promise<void> => {
    try {
      await shortcutService.saveConfig(config)
    } catch (error) {
      console.error('Failed to save shortcut config:', error)
      throw error
    }
  })

  // 验证快捷键格式
  ipcMain.handle(IPC_CHANNEL_VALIDATE_SHORTCUT, async (_event, shortcut: string): Promise<boolean> => {
    try {
      return shortcutService.validateShortcut(shortcut)
    } catch (error) {
      console.error('Failed to validate shortcut:', error)
      return false
    }
  })
}

