/**
 * 自动化配置 IPC 处理器
 */
import { ipcMain } from 'electron'
import { automationConfigFileService } from '../Service/AutomationConfig/file-service'
import type { AutomationConfigMeta, AutomationConfigData } from '../../public/types/automation-config'

const IPC_CHANNEL_LIST_CONFIGS = 'automation-config:list'
const IPC_CHANNEL_LOAD_CONFIG = 'automation-config:load'
const IPC_CHANNEL_SAVE_CONFIG = 'automation-config:save'
const IPC_CHANNEL_CREATE_CONFIG = 'automation-config:create'
const IPC_CHANNEL_DELETE_CONFIG = 'automation-config:delete'
const IPC_CHANNEL_RENAME_CONFIG = 'automation-config:rename'

/**
 * 注册自动化配置 IPC 处理器
 */
export function registerAutomationConfigHandlers(): void {
  // 列出所有配置
  ipcMain.handle(IPC_CHANNEL_LIST_CONFIGS, async (): Promise<AutomationConfigMeta[]> => {
    try {
      return await automationConfigFileService.listConfigs()
    } catch (error) {
      console.error('Failed to list automation configs:', error)
      throw error
    }
  })

  // 加载配置
  ipcMain.handle(IPC_CHANNEL_LOAD_CONFIG, async (_event, configId: string): Promise<AutomationConfigData | null> => {
    try {
      return await automationConfigFileService.loadConfig(configId)
    } catch (error) {
      console.error(`Failed to load automation config ${configId}:`, error)
      throw error
    }
  })

  // 保存配置
  ipcMain.handle(IPC_CHANNEL_SAVE_CONFIG, async (_event, data: AutomationConfigData): Promise<void> => {
    try {
      await automationConfigFileService.saveConfig(data)
    } catch (error) {
      console.error('Failed to save automation config:', error)
      throw error
    }
  })

  // 创建配置
  ipcMain.handle(IPC_CHANNEL_CREATE_CONFIG, async (_event, name: string): Promise<string> => {
    try {
      return await automationConfigFileService.createConfig(name)
    } catch (error) {
      console.error(`Failed to create automation config ${name}:`, error)
      throw error
    }
  })

  // 删除配置
  ipcMain.handle(IPC_CHANNEL_DELETE_CONFIG, async (_event, configId: string): Promise<void> => {
    try {
      await automationConfigFileService.deleteConfig(configId)
    } catch (error) {
      console.error(`Failed to delete automation config ${configId}:`, error)
      throw error
    }
  })

  // 重命名配置
  ipcMain.handle(IPC_CHANNEL_RENAME_CONFIG, async (_event, configId: string, newName: string): Promise<void> => {
    try {
      await automationConfigFileService.renameConfig(configId, newName)
    } catch (error) {
      console.error(`Failed to rename automation config ${configId}:`, error)
      throw error
    }
  })
}

