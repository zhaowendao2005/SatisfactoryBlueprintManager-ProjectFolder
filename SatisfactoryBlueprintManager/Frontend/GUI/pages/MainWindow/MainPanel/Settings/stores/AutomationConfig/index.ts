/**
 * Settings.AutomationConfig Store
 * 负责自动化配置的状态管理
 */
import { defineStore } from 'pinia'
import { Notify } from 'quasar'
import type { AutomationConfigState } from './types'
import type { AutomationConfigMeta, AutomationConfigData, ManualConfigParams } from '@types/automation-config'
import type { CalibrationResult, CalibrationType } from '@types/automation-config/calibration'
import { LocalStorageService } from '@gui/utils/localStorageService'

declare global {
  interface Window {
    automationConfigAPI?: {
      listConfigs: () => Promise<AutomationConfigMeta[]>
      loadConfig: (id: string) => Promise<AutomationConfigData | null>
      saveConfig: (data: AutomationConfigData) => Promise<void>
      createConfig: (name: string) => Promise<string>
      deleteConfig: (id: string) => Promise<void>
      renameConfig: (id: string, newName: string) => Promise<void>
      startCalibration: (type: CalibrationType) => Promise<void>
      cancelCalibration: () => Promise<void>
      onCalibrationResult: (callback: (result: CalibrationResult) => void) => () => void
      onCalibrationError: (callback: (error: string) => void) => () => void
      executeTest: (testText: string, configId?: string) => Promise<import('@types/automation-config').AutomationTestResult>
      getDisplaysInfo: () => Promise<import('@types/automation-config').DisplayInfo[]>
    }
  }
}

/**
 * 获取自动化配置 API
 */
function getAutomationConfigAPI() {
  const api = window.automationConfigAPI
  if (!api) {
    throw new Error('自动化配置 API 不可用，请确保在 Electron 环境中运行')
  }
  return api
}

export const useAutomationConfigStore = defineStore('settings.automationConfig', {
  state: (): AutomationConfigState => ({
    configList: [],
    currentConfigId: null,
    currentConfig: null,
    isLoading: false,
  }),

  actions: {
    /**
     * 加载配置列表（仅元信息）
     */
    async loadConfigList(): Promise<void> {
      try {
        this.isLoading = true
        const configs = await getAutomationConfigAPI().listConfigs()
        this.configList = configs
      } catch (error) {
        console.error('Failed to load automation config list:', error)
        Notify.create({
          type: 'negative',
          message: '加载配置列表失败',
          caption: error instanceof Error ? error.message : String(error),
        })
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 加载完整配置数据，失败时 currentConfig 设为 null
     * @注意事项 加载成功后自动保存到localStorage
     */
    async loadConfig(id: string): Promise<void> {
      try {
        this.isLoading = true
        const config = await getAutomationConfigAPI().loadConfig(id)
        if (config) {
          this.currentConfig = config
          this.currentConfigId = id
          // 保存到localStorage
          LocalStorageService.saveLastConfigId(id)
        } else {
          this.currentConfig = null
          this.currentConfigId = null
          Notify.create({
            type: 'warning',
            message: '配置加载失败',
            caption: '配置文件不存在或已损坏',
          })
        }
      } catch (error) {
        console.error(`Failed to load automation config ${id}:`, error)
        this.currentConfig = null
        this.currentConfigId = null
        Notify.create({
          type: 'negative',
          message: '加载配置失败',
          caption: error instanceof Error ? error.message : String(error),
        })
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 创建新配置，返回新配置 ID，自动加载为当前配置
     */
    async createConfig(name: string): Promise<string> {
      try {
        this.isLoading = true
        const configId = await getAutomationConfigAPI().createConfig(name)
        // 刷新配置列表
        await this.loadConfigList()
        // 自动加载新配置
        await this.loadConfig(configId)
        return configId
      } catch (error) {
        Notify.create({
          type: 'negative',
          message: '创建配置失败',
          caption: error instanceof Error ? error.message : String(error),
        })
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 更新当前配置参数（增量更新），自动保存
     */
    async updateConfigParams(params: Partial<ManualConfigParams>): Promise<void> {
      if (!this.currentConfig) {
        console.warn('Cannot update params: no current config')
        return
      }

      // 深度比较，避免无效更新导致循环
      const currentParams = this.currentConfig.params as ManualConfigParams
      
      // 比较所有字段，只有真正变化时才更新
      const inputFieldChanged = params.inputFieldPosition && 
        (params.inputFieldPosition.x !== currentParams.inputFieldPosition.x || 
         params.inputFieldPosition.y !== currentParams.inputFieldPosition.y)
      
      const firstBlueprintChanged = params.firstBlueprintPosition && 
        (params.firstBlueprintPosition.x !== currentParams.firstBlueprintPosition.x || 
         params.firstBlueprintPosition.y !== currentParams.firstBlueprintPosition.y)
      
      const blueprintTabChanged = params.blueprintTabPosition &&
        (params.blueprintTabPosition.x !== currentParams.blueprintTabPosition.x ||
         params.blueprintTabPosition.y !== currentParams.blueprintTabPosition.y)
      
      const charInputDelayChanged = params.charInputDelay !== undefined && 
        params.charInputDelay !== currentParams.charInputDelay
      
      const displayIndexChanged = 'displayIndex' in params && 
        params.displayIndex !== currentParams.displayIndex

      const tabClickDelayChanged = params.tabClickDelay !== undefined &&
        params.tabClickDelay !== (currentParams.tabClickDelay ?? 300)

      const inputFocusDelayChanged = params.inputFocusDelay !== undefined &&
        params.inputFocusDelay !== (currentParams.inputFocusDelay ?? 200)

      const firstClickDelayChanged = params.firstClickDelay !== undefined &&
        params.firstClickDelay !== (currentParams.firstClickDelay ?? 500)

      if (!inputFieldChanged && !firstBlueprintChanged && !blueprintTabChanged && 
          !charInputDelayChanged && !displayIndexChanged &&
          !tabClickDelayChanged && !inputFocusDelayChanged && 
          !firstClickDelayChanged) {
        // console.log('[Store] No change detected, skipping update')
        return
      }

      try {
        // 使用 JSON 序列化去除 Vue Proxy，确保 IPC 传递时不会出错
        const updatedConfig: AutomationConfigData = JSON.parse(JSON.stringify({
          ...this.currentConfig,
          params: {
            ...this.currentConfig.params,
            ...params,
          } as ManualConfigParams,
          updatedAt: Date.now(),
        }))
        await getAutomationConfigAPI().saveConfig(updatedConfig)
        this.currentConfig = updatedConfig
        // 更新列表中的元信息
        const metaIndex = this.configList.findIndex(c => c.id === updatedConfig.id)
        if (metaIndex >= 0) {
          this.configList[metaIndex] = {
            id: updatedConfig.id,
            name: updatedConfig.name,
            createdAt: updatedConfig.createdAt,
            updatedAt: updatedConfig.updatedAt,
          }
        }
      } catch (error) {
        console.error('Failed to update automation config params:', error)
        Notify.create({
          type: 'negative',
          message: '保存配置失败',
          caption: error instanceof Error ? error.message : String(error),
        })
        throw error
      }
    },

    /**
     * 删除配置，如果删除的是当前配置则清空 currentConfig
     * @注意事项 如果删除的是当前配置，清除localStorage
     */
    async deleteConfig(id: string): Promise<void> {
      try {
        this.isLoading = true
        await getAutomationConfigAPI().deleteConfig(id)
        // 从列表中移除
        this.configList = this.configList.filter(c => c.id !== id)
        // 如果删除的是当前配置，清空
        if (this.currentConfigId === id) {
          this.currentConfig = null
          this.currentConfigId = null
          // 清除localStorage
          LocalStorageService.clearLastConfigId()
        }
      } catch (error) {
        console.error(`Failed to delete automation config ${id}:`, error)
        Notify.create({
          type: 'negative',
          message: '删除配置失败',
          caption: error instanceof Error ? error.message : String(error),
        })
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 重命名配置，不改变文件名（ID）
     */
    async renameConfig(id: string, newName: string): Promise<void> {
      try {
        this.isLoading = true
        await getAutomationConfigAPI().renameConfig(id, newName)
        // 更新列表中的元信息
        const metaIndex = this.configList.findIndex(c => c.id === id)
        if (metaIndex >= 0) {
          this.configList[metaIndex].name = newName
        }
        // 如果重命名的是当前配置，更新 currentConfig
        if (this.currentConfig?.id === id) {
          this.currentConfig.name = newName
        }
      } catch (error) {
        console.error(`Failed to rename automation config ${id}:`, error)
        Notify.create({
          type: 'negative',
          message: '重命名配置失败',
          caption: error instanceof Error ? error.message : String(error),
        })
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 初始化：从localStorage恢复上次使用的配置
     * @注意事项 仅在应用启动时调用，静默失败（不显示错误提示）
     */
    async initializeFromLocalStorage(): Promise<void> {
      try {
        const lastConfigId = LocalStorageService.getLastConfigId()
        if (lastConfigId) {
          // 先加载配置列表
          await this.loadConfigList()
          // 检查配置是否存在
          const configExists = this.configList.some(c => c.id === lastConfigId)
          if (configExists) {
            // 静默加载，不显示错误提示
            try {
              await this.loadConfig(lastConfigId)
            } catch {
              // 配置加载失败，清除localStorage
              LocalStorageService.clearLastConfigId()
            }
          } else {
            // 配置不存在，清除localStorage
            LocalStorageService.clearLastConfigId()
          }
        }
      } catch (error) {
        console.error('Failed to initialize from localStorage:', error)
        // 静默失败，不影响应用启动
      }
    },
  },
})

