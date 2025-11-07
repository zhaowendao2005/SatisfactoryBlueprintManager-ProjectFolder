/**
 * 快捷键配置 API 预加载脚本
 */
import { contextBridge, ipcRenderer } from 'electron'
import type { ShortcutConfig } from '../../public/types/shortcut-config'

const IPC_CHANNEL_LOAD_SHORTCUT_CONFIG = 'shortcut:load-config'
const IPC_CHANNEL_SAVE_SHORTCUT_CONFIG = 'shortcut:save-config'
const IPC_CHANNEL_VALIDATE_SHORTCUT = 'shortcut:validate'

/**
 * Electron 快捷键配置 API
 */
export interface ElectronShortcutConfigAPI {
  /**
   * 加载快捷键配置
   */
  loadShortcutConfig(): Promise<ShortcutConfig>

  /**
   * 保存快捷键配置（自动重新注册）
   */
  saveShortcutConfig(config: ShortcutConfig): Promise<void>

  /**
   * 验证快捷键格式是否有效
   */
  validateShortcut(shortcut: string): Promise<boolean>
}

/**
 * 暴露快捷键配置 API 到渲染进程
 */
export function exposeShortcutConfigAPI(): void {
  contextBridge.exposeInMainWorld('shortcutConfigAPI', {
    loadShortcutConfig: (): Promise<ShortcutConfig> => {
      return ipcRenderer.invoke(IPC_CHANNEL_LOAD_SHORTCUT_CONFIG)
    },

    saveShortcutConfig: (config: ShortcutConfig): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNEL_SAVE_SHORTCUT_CONFIG, config)
    },

    validateShortcut: (shortcut: string): Promise<boolean> => {
      return ipcRenderer.invoke(IPC_CHANNEL_VALIDATE_SHORTCUT, shortcut)
    },
  } as ElectronShortcutConfigAPI)
}

