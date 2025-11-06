/**
 * 自动化配置 API 预加载脚本
 */
import { contextBridge, ipcRenderer } from 'electron'
import type { AutomationConfigMeta, AutomationConfigData } from '../../public/types/automation-config'

const IPC_CHANNEL_LIST_CONFIGS = 'automation-config:list'
const IPC_CHANNEL_LOAD_CONFIG = 'automation-config:load'
const IPC_CHANNEL_SAVE_CONFIG = 'automation-config:save'
const IPC_CHANNEL_CREATE_CONFIG = 'automation-config:create'
const IPC_CHANNEL_DELETE_CONFIG = 'automation-config:delete'
const IPC_CHANNEL_RENAME_CONFIG = 'automation-config:rename'

/**
 * Electron 自动化配置 API
 */
export interface ElectronAutomationConfigAPI {
  /**
   * 列出所有配置（仅元信息）
   */
  listConfigs(): Promise<AutomationConfigMeta[]>

  /**
   * 加载完整配置数据
   */
  loadConfig(configId: string): Promise<AutomationConfigData | null>

  /**
   * 保存配置数据
   */
  saveConfig(data: AutomationConfigData): Promise<void>

  /**
   * 创建新配置
   */
  createConfig(name: string): Promise<string>

  /**
   * 删除配置
   */
  deleteConfig(configId: string): Promise<void>

  /**
   * 重命名配置
   */
  renameConfig(configId: string, newName: string): Promise<void>
}

/**
 * 暴露自动化配置 API 到渲染进程
 */
export function exposeAutomationConfigAPI(): void {
  contextBridge.exposeInMainWorld('automationConfigAPI', {
    listConfigs: (): Promise<AutomationConfigMeta[]> => {
      return ipcRenderer.invoke(IPC_CHANNEL_LIST_CONFIGS)
    },

    loadConfig: (configId: string): Promise<AutomationConfigData | null> => {
      return ipcRenderer.invoke(IPC_CHANNEL_LOAD_CONFIG, configId)
    },

    saveConfig: (data: AutomationConfigData): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNEL_SAVE_CONFIG, data)
    },

    createConfig: (name: string): Promise<string> => {
      return ipcRenderer.invoke(IPC_CHANNEL_CREATE_CONFIG, name)
    },

    deleteConfig: (configId: string): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNEL_DELETE_CONFIG, configId)
    },

    renameConfig: (configId: string, newName: string): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNEL_RENAME_CONFIG, configId, newName)
    },
  } as ElectronAutomationConfigAPI)
}

