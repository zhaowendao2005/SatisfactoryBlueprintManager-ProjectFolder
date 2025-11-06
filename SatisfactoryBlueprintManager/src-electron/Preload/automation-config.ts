/**
 * 自动化配置 API 预加载脚本
 */
import { contextBridge, ipcRenderer } from 'electron'
import type { AutomationConfigMeta, AutomationConfigData, AutomationTestResult, DisplayInfo } from '../../public/types/automation-config'
import type { CalibrationResult, CalibrationType } from '../../public/types/automation-config/calibration'

const IPC_CHANNEL_LIST_CONFIGS = 'automation-config:list'
const IPC_CHANNEL_LOAD_CONFIG = 'automation-config:load'
const IPC_CHANNEL_SAVE_CONFIG = 'automation-config:save'
const IPC_CHANNEL_CREATE_CONFIG = 'automation-config:create'
const IPC_CHANNEL_DELETE_CONFIG = 'automation-config:delete'
const IPC_CHANNEL_RENAME_CONFIG = 'automation-config:rename'
const IPC_CHANNEL_START_CALIBRATION = 'automation-config:start-calibration'
const IPC_CHANNEL_CANCEL_CALIBRATION = 'automation-config:cancel-calibration'
const IPC_CHANNEL_EXECUTE_TEST = 'automation-config:execute-test'
const IPC_CHANNEL_GET_DISPLAYS_INFO = 'automation-config:get-displays-info'
const IPC_EVENT_CALIBRATION_RESULT = 'calibration:result'
const IPC_EVENT_CALIBRATION_ERROR = 'calibration:error'

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

  /**
   * 启动坐标标定
   * @param type - 标定类型
   * @returns Promise<void> 立即返回，结果通过事件推送
   */
  startCalibration(type: CalibrationType): Promise<void>

  /**
   * 取消坐标标定
   */
  cancelCalibration(): Promise<void>

  /**
   * 监听标定结果
   * @param callback - 结果回调
   * @returns 取消监听函数
   */
  onCalibrationResult(callback: (result: CalibrationResult) => void): () => void

  /**
   * 监听标定错误
   * @param callback - 错误回调
   * @returns 取消监听函数
   */
  onCalibrationError(callback: (error: string) => void): () => void

  /**
   * 执行自动化测试（测试流程：点击输入栏 -> 逐字符输入 -> 点击第一蓝图）
   * @param testText 测试文本
   * @param configId 配置 ID（可选，不提供则使用第一个配置）
   * @returns 执行结果
   * @throws 配置无效、超时、执行失败
   */
  executeTest(testText: string, configId?: string): Promise<AutomationTestResult>

  /**
   * 获取所有显示器信息
   * @returns 显示器信息数组，按索引排序
   */
  getDisplaysInfo(): Promise<DisplayInfo[]>
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

    startCalibration: (type: CalibrationType): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNEL_START_CALIBRATION, type)
    },

    cancelCalibration: (): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNEL_CANCEL_CALIBRATION)
    },

    onCalibrationResult: (callback: (result: CalibrationResult) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, result: CalibrationResult) => {
        callback(result)
      }
      ipcRenderer.on(IPC_EVENT_CALIBRATION_RESULT, handler)
      return () => {
        ipcRenderer.removeListener(IPC_EVENT_CALIBRATION_RESULT, handler)
      }
    },

    onCalibrationError: (callback: (error: string) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, error: string) => {
        callback(error)
      }
      ipcRenderer.on(IPC_EVENT_CALIBRATION_ERROR, handler)
      return () => {
        ipcRenderer.removeListener(IPC_EVENT_CALIBRATION_ERROR, handler)
      }
    },

    executeTest: (testText: string, configId?: string): Promise<AutomationTestResult> => {
      return ipcRenderer.invoke(IPC_CHANNEL_EXECUTE_TEST, testText, configId)
    },

    getDisplaysInfo: (): Promise<DisplayInfo[]> => {
      return ipcRenderer.invoke(IPC_CHANNEL_GET_DISPLAYS_INFO)
    },
  } as ElectronAutomationConfigAPI)
}

