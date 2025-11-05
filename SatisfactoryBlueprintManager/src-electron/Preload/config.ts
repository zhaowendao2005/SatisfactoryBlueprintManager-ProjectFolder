/**
 * 配置管理 API 预加载脚本
 */
import { contextBridge, ipcRenderer } from 'electron'
import type { ConfigMeta, ConfigFileData } from '../../public/types/config'

const IPC_CHANNEL_LIST_CONFIGS = 'config:list'
const IPC_CHANNEL_LOAD_CONFIG = 'config:load'
const IPC_CHANNEL_SAVE_CONFIG = 'config:save'
const IPC_CHANNEL_DELETE_CONFIG = 'config:delete'
const IPC_CHANNEL_RENAME_CONFIG = 'config:rename'

/**
 * Electron 配置 API
 */
export interface ElectronConfigAPI {
  /**
   * 列出所有配置（仅元信息）
   */
  listConfigs(): Promise<ConfigMeta[]>

  /**
   * 加载完整配置数据
   */
  loadConfig(configId: string): Promise<ConfigFileData | null>

  /**
   * 保存配置数据
   */
  saveConfig(data: ConfigFileData): Promise<void>

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
 * 暴露配置 API 到渲染进程
 */
export function exposeConfigAPI(): void {
  contextBridge.exposeInMainWorld('configAPI', {
    listConfigs: (): Promise<ConfigMeta[]> => {
      return ipcRenderer.invoke(IPC_CHANNEL_LIST_CONFIGS)
    },

    loadConfig: (configId: string): Promise<ConfigFileData | null> => {
      return ipcRenderer.invoke(IPC_CHANNEL_LOAD_CONFIG, configId)
    },

    saveConfig: (data: ConfigFileData): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNEL_SAVE_CONFIG, data)
    },

    deleteConfig: (configId: string): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNEL_DELETE_CONFIG, configId)
    },

    renameConfig: (configId: string, newName: string): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNEL_RENAME_CONFIG, configId, newName)
    },
  } as ElectronConfigAPI)
}

