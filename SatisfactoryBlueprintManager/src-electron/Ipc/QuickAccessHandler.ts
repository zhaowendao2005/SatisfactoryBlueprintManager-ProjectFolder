/**
 * 快速访问窗口 IPC 处理器
 */
import { ipcMain, BrowserWindow } from 'electron'
import { globalTagsFileService } from '../Service/GlobalTags/file-service'
import { quickAccessWindowService } from '../Service/QuickAccess/QuickAccessWindowService'
import { generalSettingsFileService } from '../Service/GeneralSettings/file-service'
import type { GlobalTagsConfig } from '../Service/GlobalTags/file-service'
import { automationConfigFileService } from '../Service/AutomationConfig/file-service'
import { automationExecutor } from '../Service/Automation/AutomationExecutor'

const IPC_CHANNEL_SUBSCRIBE_GLOBAL_TAGS = 'quick-access:subscribe-global-tags'
const IPC_CHANNEL_UNSUBSCRIBE = 'quick-access:unsubscribe'
const IPC_CHANNEL_GET_BLUEPRINTS = 'quick-access:get-blueprints'
const IPC_CHANNEL_USE_BLUEPRINT = 'quick-access:use-blueprint'
const IPC_CHANNEL_RECORD_BLUEPRINT_USAGE = 'quick-access:record-blueprint-usage'
const IPC_CHANNEL_GET_RECENT_BLUEPRINTS = 'quick-access:get-recent-blueprints'
const IPC_CHANNEL_SHOW_QUICK_ACCESS = 'quick-access:show'
const IPC_CHANNEL_HIDE_QUICK_ACCESS = 'quick-access:hide'
const IPC_CHANNEL_TOGGLE_QUICK_ACCESS = 'quick-access:toggle'

// 全局标签更新事件频道
const IPC_CHANNEL_GLOBAL_TAGS_UPDATED = 'global-tags:updated'

// 存储最近使用的蓝图（内存中，应用重启后从配置文件加载）
let recentBlueprints: Array<{ path: string; timestamp: number }> = []
const MAX_RECENT_BLUEPRINTS = 20 // 最大记录数

// 缓存主窗口推送的蓝图数据
let cachedBlueprints: Array<{
  id: string
  name: string
  path: string
  directoryPath?: string
  tags: string[]
}> = []

/**
 * 从配置文件加载最近使用的蓝图
 */
async function loadRecentBlueprintsFromSettings(): Promise<void> {
  try {
    const settings = await generalSettingsFileService.loadSettings()
    recentBlueprints = settings.recentBlueprints || []
  } catch (error) {
    console.error('[QuickAccessHandler] 加载最近使用蓝图失败:', error)
    recentBlueprints = []
  }
}

/**
 * 保存最近使用的蓝图到配置文件
 */
async function saveRecentBlueprintsToSettings(): Promise<void> {
  try {
    const settings = await generalSettingsFileService.loadSettings()
    settings.recentBlueprints = recentBlueprints
    await generalSettingsFileService.saveSettings(settings)
  } catch (error) {
    console.error('[QuickAccessHandler] 保存最近使用蓝图失败:', error)
  }
}

/**
 * 注册快速访问窗口 IPC 处理器
 */
export function registerQuickAccessHandlers(mainWindow: BrowserWindow): void {
  // 初始化时加载最近使用的蓝图
  void loadRecentBlueprintsFromSettings()
  
  // 监听主窗口推送的蓝图数据
  ipcMain.on('main-window:push-blueprints', (_event, blueprints) => {
    console.log('[QuickAccessHandler] 收到主窗口推送的蓝图数据:', blueprints.length)
    cachedBlueprints = blueprints
    
    // 如果快速访问窗口可见，通知它刷新
    const quickAccessWindow = quickAccessWindowService.getWindow()
    if (quickAccessWindow && quickAccessWindow.isVisible()) {
      quickAccessWindow.webContents.send('quick-access:blueprints-updated', blueprints)
    }
  })
  
  // 订阅全局标签数据
  ipcMain.handle(IPC_CHANNEL_SUBSCRIBE_GLOBAL_TAGS, async (): Promise<GlobalTagsConfig> => {
    try {
      const config = await globalTagsFileService.loadGlobalTags()
      return config
    } catch (error) {
      console.error('[QuickAccessHandler] 加载全局标签失败:', error)
      // 返回空配置
      return {
        version: '1.0.0',
        tags: [],
        blueprintTags: {},
      }
    }
  })

  // 取消订阅（目前不需要特殊处理）
  ipcMain.handle(IPC_CHANNEL_UNSUBSCRIBE, async (): Promise<void> => {
    // 清理逻辑（如果需要）
  })

  // 获取蓝图列表（返回缓存的数据）
  ipcMain.handle(IPC_CHANNEL_GET_BLUEPRINTS, async (): Promise<Array<{
    id: string
    name: string
    path: string
    directoryPath?: string
    tags: string[]
  }>> => {
    console.log('[QuickAccessHandler] 返回缓存的蓝图数据:', cachedBlueprints.length)
    return cachedBlueprints
  })

  // 使用蓝图（转发给主窗口的自动化服务）
  ipcMain.handle(IPC_CHANNEL_USE_BLUEPRINT, async (_event, blueprintPath: string): Promise<void> => {
    try {
      // 从路径中提取蓝图名称（文件名，不含扩展名）
      const pathParts = blueprintPath.split(/[/\\]/)
      const fileName = pathParts[pathParts.length - 1] || blueprintPath
      const blueprintName = fileName.replace(/\.(sbp|sbpcfg)$/i, '')

      // 获取配置ID（使用第一个可用配置，或从主窗口获取当前配置）
      // TODO: 需要从主窗口的 Store 获取当前配置ID，暂时使用第一个配置
      const configs = await automationConfigFileService.listConfigs()
      if (configs.length === 0) {
        throw new Error('没有可用的配置，请先创建一个配置')
      }
      const configId = configs[0].id

      // 加载配置
      const currentConfig = await automationConfigFileService.loadConfig(configId)
      if (!currentConfig || currentConfig.mode !== 'manual') {
        throw new Error('当前配置无效或不是手动配置模式')
      }

      const params = currentConfig.params as import('../../public/types/automation-config').ManualConfigParams

      // 执行自动化测试
      const result = await automationExecutor.execute(blueprintName, params)

      if (!result.success) {
        throw new Error(result.message || '蓝图使用失败')
      }

      // 记录使用历史
      await recordBlueprintUsage(blueprintPath)

      console.log(`[QuickAccessHandler] 蓝图使用成功: ${blueprintName}`)
    } catch (error) {
      console.error('[QuickAccessHandler] 使用蓝图失败:', error)
      throw error
    }
  })

  // 记录蓝图使用
  ipcMain.handle(IPC_CHANNEL_RECORD_BLUEPRINT_USAGE, async (_event, blueprintPath: string): Promise<void> => {
    await recordBlueprintUsage(blueprintPath)
  })

  // 获取最近使用的蓝图列表
  ipcMain.handle(IPC_CHANNEL_GET_RECENT_BLUEPRINTS, async (): Promise<Array<{ path: string; timestamp: number }>> => {
    try {
      const settings = await generalSettingsFileService.loadSettings()
      const maxCount = settings.quickAccessRecentBlueprintsCount || 10
      return recentBlueprints.slice(0, Math.min(maxCount, MAX_RECENT_BLUEPRINTS))
    } catch (error) {
      console.error('[QuickAccessHandler] 获取最近使用蓝图失败:', error)
      return []
    }
  })

  // 显示快速访问窗口
  ipcMain.handle(IPC_CHANNEL_SHOW_QUICK_ACCESS, async (): Promise<void> => {
    quickAccessWindowService.show()
  })

  // 隐藏快速访问窗口
  ipcMain.handle(IPC_CHANNEL_HIDE_QUICK_ACCESS, async (): Promise<void> => {
    quickAccessWindowService.hide()
  })

  // 切换快速访问窗口
  ipcMain.handle(IPC_CHANNEL_TOGGLE_QUICK_ACCESS, async (): Promise<void> => {
    quickAccessWindowService.toggle()
  })
}

/**
 * 记录蓝图使用
 */
async function recordBlueprintUsage(blueprintPath: string): Promise<void> {
  const timestamp = Date.now()

  // 移除已存在的记录（如果有）
  const existingIndex = recentBlueprints.findIndex((item) => item.path === blueprintPath)
  if (existingIndex >= 0) {
    recentBlueprints.splice(existingIndex, 1)
  }

  // 添加到开头
  recentBlueprints.unshift({ path: blueprintPath, timestamp })

  // 限制数量
  const settings = await generalSettingsFileService.loadSettings()
  const maxCount = settings.quickAccessRecentBlueprintsCount || 10
  if (recentBlueprints.length > maxCount) {
    recentBlueprints.splice(maxCount)
  }

  // 持久化到配置文件
  await saveRecentBlueprintsToSettings()
}

