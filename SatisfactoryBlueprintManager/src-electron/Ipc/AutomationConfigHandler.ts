/**
 * 自动化配置 IPC 处理器
 */
import { ipcMain, screen, type BrowserWindow } from 'electron'
import { automationConfigFileService } from '../Service/AutomationConfig/file-service'
import { calibrationService } from '../Service/Calibration'
import { automationExecutor } from '../Service/Automation/AutomationExecutor'
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

/**
 * 注册自动化配置 IPC 处理器
 */
export function registerAutomationConfigHandlers(mainWindow?: BrowserWindow): void {
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

  // 注册坐标标定相关 IPC 处理器
  if (mainWindow) {
    registerCalibrationHandlers(mainWindow)
  }

  // 注册自动化测试和显示器信息 IPC 处理器
  registerAutomationTestHandlers()
  registerDisplayInfoHandlers()
}

/**
 * 注册坐标标定相关 IPC 处理器
 */
function registerCalibrationHandlers(mainWindow: BrowserWindow): void {
  // 启动坐标标定
  ipcMain.handle(IPC_CHANNEL_START_CALIBRATION, async (_event, type: CalibrationType): Promise<void> => {
    try {
      if (!mainWindow || mainWindow.isDestroyed()) {
        throw new Error('主窗口不可用')
      }

      // 启动标定流程（异步执行，结果通过事件推送）
      calibrationService
        .startCalibration(mainWindow, type)
        .then((result: CalibrationResult) => {
          // 通过事件推送结果到渲染进程
          _event.sender.send('calibration:result', result)
        })
        .catch((error: Error) => {
          // 通过事件推送错误到渲染进程
          _event.sender.send('calibration:error', error.message)
        })
    } catch (error) {
      console.error('Failed to start calibration:', error)
      _event.sender.send('calibration:error', (error as Error).message)
      throw error
    }
  })

  // 取消坐标标定
  ipcMain.handle(IPC_CHANNEL_CANCEL_CALIBRATION, async (): Promise<void> => {
    try {
      calibrationService.cancelCalibration()
    } catch (error) {
      console.error('Failed to cancel calibration:', error)
      throw error
    }
  })
}

/**
 * 注册自动化测试相关 IPC 处理器
 */
function registerAutomationTestHandlers(): void {
  // 执行自动化测试
  ipcMain.handle(IPC_CHANNEL_EXECUTE_TEST, async (_event, testText: string, configId?: string): Promise<AutomationTestResult> => {
    try {
      // 获取配置 ID（如果未提供，则使用第一个配置）
      let targetConfigId: string
      if (configId) {
        targetConfigId = configId
      } else {
        const configs = await automationConfigFileService.listConfigs()
        if (configs.length === 0) {
          throw new Error('没有可用的配置，请先创建一个配置')
        }
        targetConfigId = configs[0].id
      }

      // 加载配置
      const currentConfig = await automationConfigFileService.loadConfig(targetConfigId)
      if (!currentConfig || currentConfig.mode !== 'manual') {
        throw new Error('当前配置无效或不是手动配置模式')
      }

      const params = currentConfig.params as import('../../public/types/automation-config').ManualConfigParams

      // 执行测试
      const result = await automationExecutor.execute(testText, params)
      return result
    } catch (error) {
      console.error('Failed to execute automation test:', error)
      
      // 如果是 ValidationError 或 TimeoutError，直接抛出
      if (error instanceof Error && (error.name === 'ValidationError' || error.name === 'TimeoutError')) {
        throw error
      }

      // 其他错误包装为 AutomationTestResult
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      }
    }
  })
}

/**
 * 注册显示器信息相关 IPC 处理器
 */
function registerDisplayInfoHandlers(): void {
  // 获取所有显示器信息
  ipcMain.handle(IPC_CHANNEL_GET_DISPLAYS_INFO, async (): Promise<DisplayInfo[]> => {
    try {
      const displays = screen.getAllDisplays()
      const primaryDisplay = screen.getPrimaryDisplay()

      return displays.map((display, index) => ({
        id: index,
        bounds: {
          x: display.bounds.x,
          y: display.bounds.y,
          width: display.bounds.width,
          height: display.bounds.height,
        },
        scaleFactor: display.scaleFactor,
        isPrimary: display.id === primaryDisplay.id,
      }))
    } catch (error) {
      console.error('Failed to get displays info:', error)
      throw error
    }
  })
}

