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

declare global {
  interface Window {
    electronAPI?: ElectronWindowAPI
    blueprintAPI?: ElectronBlueprintAPI
  }
}

