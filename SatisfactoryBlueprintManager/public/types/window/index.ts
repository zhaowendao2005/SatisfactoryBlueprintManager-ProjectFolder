/**
 * 窗口控制操作类型
 */
export type WindowControlAction = 'minimize' | 'maximize' | 'unmaximize' | 'close'

/**
 * Electron IPC 窗口控制 API（preload 暴露）
 * @注意事项 仅在 Electron 环境可用，浏览器环境返回 undefined
 */
export interface ElectronWindowAPI {
  /** 执行窗口控制操作 */
  windowControl: (action: WindowControlAction) => Promise<void>
  /** 监听窗口最大化状态变化 */
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => void
  /** 主窗口推送蓝图数据给快速访问窗口 */
  pushBlueprintsToQuickAccess: (blueprints: Array<{
    id: string
    name: string
    path: string
    directoryPath?: string
    tags: string[]
  }>) => void
}

/**
 * 蓝图相关 Electron IPC API
 * @注意事项 仅在 Electron 环境可用
 */
import type {
  SelectDirectoryResult,
  ScanDirectoryParams,
  ScanDirectoryResult,
  SourceConfigFile,
  BlueprintNode,
} from '../blueprint'

export interface ElectronBlueprintAPI {
  /**
   * 打开文件夹选择对话框
   * @returns Promise<SelectDirectoryResult>
   */
  selectDirectory(): Promise<SelectDirectoryResult>

  /**
   * 扫描目录（递归）
   * @param params 扫描参数
   * @returns Promise<ScanDirectoryResult>
   * @注意事项 超时会抛出 TimeoutError 异常
   */
  scanDirectory(params: ScanDirectoryParams): Promise<ScanDirectoryResult>

  /**
   * 读取单层目录（非递归，用于懒加载）
   * @param dirPath 目录路径
   * @returns Promise<BlueprintNode[]>
   */
  readDirectoryShallow(dirPath: string): Promise<BlueprintNode[]>

  /**
   * 写入配置文件
   * @param sourcePath 源路径
   * @param config 配置对象
   * @returns Promise<void>
   */
  writeSourceConfig(sourcePath: string, config: SourceConfigFile): Promise<void>

  /**
   * 读取配置文件
   * @param sourcePath 源路径
   * @returns Promise<SourceConfigFile | null>
   */
  readSourceConfig(sourcePath: string): Promise<SourceConfigFile | null>
}

/**
 * 配置管理 Electron IPC API
 * @注意事项 仅在 Electron 环境可用
 */
import type { ConfigMeta, ConfigFileData } from '../config'

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
 * 同步相关 Electron IPC API
 * @注意事项 仅在 Electron 环境可用
 */
import type {
  SyncLibraryToGameParams,
  SyncGameToLibraryParams,
  SyncResult,
  BlueprintIndex,
  FileLockStatus,
  BlueprintSource,
  NewBlueprintsResult,
  SyncConfigFile,
} from '../sync'

export interface ElectronSyncAPI {
  /** 获取默认路径 */
  getDefaultPaths(): Promise<{
    saveGamePath: string
    libraryPath: string
    backupPath: string
  }>

  /** 扫描存档目录下的所有一级目录 */
  scanSaveGames(basePath: string): Promise<string[]>

  /** 构建蓝图索引 */
  buildIndex(sources: BlueprintSource[]): Promise<BlueprintIndex>

  /** 检测新增蓝图 */
  detectNewBlueprints(gamePath: string, index: BlueprintIndex): Promise<NewBlueprintsResult>

  /** 库→游戏同步 */
  syncLibraryToGame(params: SyncLibraryToGameParams): Promise<SyncResult>

  /** 游戏→库同步（简化版：只处理新增蓝图） */
  syncGameToLibrary(params: SyncGameToLibraryParams): Promise<SyncResult>

  /** 读取同步配置 */
  readSyncConfig(gamePath: string): Promise<SyncConfigFile | null>

  /** 检查文件占用 */
  checkFileLock(filePath: string): Promise<FileLockStatus>

  /** 创建备份 */
  createBackup(sourcePath: string, backupPath: string): Promise<string>

  /** 打开文件夹 */
  openFolder(path: string): Promise<void>
}

/**
 * 蓝图信息 Electron IPC API
 * @注意事项 仅在 Electron 环境可用
 */
import type {
  BlueprintPathInfo,
  BlueprintInfo,
  ParseResult,
  ParseProgressInfo,
} from '../blueprint-info'

export interface ElectronBlueprintInfoAPI {
  /**
   * 批量解析蓝图配置文件
   * @param blueprints 蓝图路径信息列表
   * @returns 解析结果（成功和失败的 blueprintId）
   * @throws 如果主进程服务不可用
   */
  parseBlueprints(blueprints: BlueprintPathInfo[]): Promise<ParseResult>

  /**
   * 订阅解析进度事件
   * @param callback 进度回调函数
   * @returns 取消订阅的函数
   */
  onProgress(callback: (progress: ParseProgressInfo) => void): () => void

  /**
   * 获取已解析的蓝图信息
   * @param blueprintId 蓝图 ID
   * @returns 蓝图信息，如果未解析则返回 null
   */
  getBlueprintInfo(blueprintId: string): Promise<BlueprintInfo | null>

  /**
   * 列出所有已解析的蓝图 ID
   * @returns blueprintId 列表
   */
  listParsedBlueprints(): Promise<string[]>
}

/**
 * 全局标签 Electron IPC API
 * @注意事项 仅在 Electron 环境可用
 */
export interface ElectronGlobalTagsAPI {
  /**
   * 加载全局标签配置
   */
  loadGlobalTags(): Promise<{
    version: string
    tags: Array<{
      id: string
      name: string
      color: string
    }>
    blueprintTags: Record<string, string[]>
  }>

  /**
   * 保存全局标签配置
   */
  saveGlobalTags(data: {
    version: string
    tags: Array<{
      id: string
      name: string
      color: string
    }>
    blueprintTags: Record<string, string[]>
  }): Promise<void>
}

/**
 * 快捷键配置 Electron IPC API
 * @注意事项 仅在 Electron 环境可用
 */
import type { ShortcutConfig } from '../shortcut-config'

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
 * 通用设置 Electron IPC API
 * @注意事项 仅在 Electron 环境可用
 */
import type { GeneralSettingsConfig } from '../general-settings'

export interface ElectronGeneralSettingsAPI {
  /**
   * 加载通用设置
   */
  loadGeneralSettings(): Promise<GeneralSettingsConfig>

  /**
   * 保存通用设置
   */
  saveGeneralSettings(config: GeneralSettingsConfig): Promise<void>

  /**
   * 显示窗口
   */
  showWindow(): Promise<void>

  /**
   * 隐藏窗口
   */
  hideWindow(): Promise<void>
}

/**
 * 快速访问窗口 Electron IPC API
 * @注意事项 仅在 Electron 环境可用
 */
export interface ElectronQuickAccessAPI {
  /**
   * 订阅全局标签数据
   */
  subscribeGlobalTags(): Promise<{
    version: string
    tags: Array<{
      id: string
      name: string
      color: string
    }>
    blueprintTags: Record<string, string[]>
  }>

  /**
   * 取消订阅
   */
  unsubscribe(): void

  /**
   * 获取蓝图列表（从主窗口获取）
   */
  getBlueprints(): Promise<Array<{
    id: string
    name: string
    path: string
    directoryPath?: string
    tags: string[]
  }>>

  /**
   * 使用蓝图（转发给主窗口）
   */
  useBlueprint(blueprintPath: string): Promise<void>

  /**
   * 记录蓝图使用（用于最近使用列表）
   */
  recordBlueprintUsage(blueprintPath: string): Promise<void>

  /**
   * 获取最近使用的蓝图列表
   */
  getRecentBlueprints(): Promise<Array<{ path: string; timestamp: number }>>

  /**
   * 监听全局标签更新事件
   */
  onGlobalTagsUpdated(callback: (config: {
    version: string
    tags: Array<{
      id: string
      name: string
      color: string
    }>
    blueprintTags: Record<string, string[]>
  }) => void): () => void

  /**
   * 监听蓝图数据更新事件（主窗口推送）
   */
  onBlueprintsUpdated(callback: (blueprints: Array<{
    id: string
    name: string
    path: string
    directoryPath?: string
    tags: string[]
  }>) => void): () => void

  /**
   * 显示快速访问窗口
   */
  showQuickAccess(): Promise<void>

  /**
   * 隐藏快速访问窗口
   */
  hideQuickAccess(): Promise<void>

  /**
   * 切换快速访问窗口
   */
  toggleQuickAccess(): Promise<void>
}

declare global {
  interface Window {
    electronAPI?: ElectronWindowAPI
    blueprintAPI?: ElectronBlueprintAPI
    configAPI?: ElectronConfigAPI
    globalTagsAPI?: ElectronGlobalTagsAPI
    syncAPI?: ElectronSyncAPI
    blueprintInfoAPI?: ElectronBlueprintInfoAPI
    shortcutConfigAPI?: ElectronShortcutConfigAPI
    generalSettingsAPI?: ElectronGeneralSettingsAPI
    quickAccessAPI?: ElectronQuickAccessAPI
  }
}

