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

declare global {
  interface Window {
    electronAPI?: ElectronWindowAPI
    blueprintAPI?: ElectronBlueprintAPI
    configAPI?: ElectronConfigAPI
    syncAPI?: ElectronSyncAPI
    blueprintInfoAPI?: ElectronBlueprintInfoAPI
  }
}

