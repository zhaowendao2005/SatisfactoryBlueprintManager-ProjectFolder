/**
 * 配置管理 IPC 处理器
 */
import { ipcMain } from 'electron'
import { configFileService } from '../Service/Config/file-service'
import type { ConfigMeta, ConfigFileData } from '../../public/types/config'

const IPC_CHANNEL_LIST_CONFIGS = 'config:list'
const IPC_CHANNEL_LOAD_CONFIG = 'config:load'
const IPC_CHANNEL_SAVE_CONFIG = 'config:save'
const IPC_CHANNEL_DELETE_CONFIG = 'config:delete'
const IPC_CHANNEL_RENAME_CONFIG = 'config:rename'

/**
 * 注册配置管理 IPC 处理器
 */
export function registerConfigHandlers(): void {
  // 列出所有配置
  ipcMain.handle(IPC_CHANNEL_LIST_CONFIGS, async (): Promise<ConfigMeta[]> => {
    try {
      return await configFileService.listConfigs()
    } catch (error) {
      console.error('Failed to list configs:', error)
      throw error
    }
  })

  // 加载配置
  ipcMain.handle(IPC_CHANNEL_LOAD_CONFIG, async (_event, configId: string): Promise<ConfigFileData | null> => {
    try {
      return await configFileService.loadConfig(configId)
    } catch (error) {
      console.error(`Failed to load config ${configId}:`, error)
      throw error
    }
  })

  // 保存配置
  ipcMain.handle(IPC_CHANNEL_SAVE_CONFIG, async (_event, data: ConfigFileData): Promise<void> => {
    try {
      await configFileService.saveConfig(data)
    } catch (error) {
      console.error('Failed to save config:', error)
      throw error
    }
  })

  // 删除配置
  ipcMain.handle(IPC_CHANNEL_DELETE_CONFIG, async (_event, configId: string): Promise<void> => {
    try {
      await configFileService.deleteConfig(configId)
    } catch (error) {
      console.error(`Failed to delete config ${configId}:`, error)
      throw error
    }
  })

  // 重命名配置
  ipcMain.handle(IPC_CHANNEL_RENAME_CONFIG, async (_event, configId: string, newName: string): Promise<void> => {
    try {
      await configFileService.renameConfig(configId, newName)
    } catch (error) {
      console.error(`Failed to rename config ${configId}:`, error)
      throw error
    }
  })
}

