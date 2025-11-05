/**
 * 蓝图相关跨层级类型定义
 * 用于 Frontend 渲染进程与 Electron 主进程之间的通信
 */

/**
 * 蓝图源配置文件结构
 * @注意事项 存储在蓝图源目录下的 SatisfactoryBlueprintManager.config.json
 */
export interface SourceConfigFile {
  version: string // 配置版本，默认 '1.0.0'
  sourceId: string // 源 id（由前端生成）
  sourceName: string // 源名称（用户输入）
  createdAt: number // 创建时间戳
  lastScannedAt: number // 最后扫描时间戳
  metadata?: {
    fileCount?: number // 蓝图文件数量
    totalSize?: number // 总大小（字节）
  }
}

/**
 * 目录扫描参数
 */
export interface ScanDirectoryParams {
  path: string // 目录路径
  maxDepth?: number // 最大深度，默认 5
  timeout?: number // 超时时间（毫秒），默认 10000
}

/**
 * 目录扫描结果
 */
export interface ScanDirectoryResult {
  tree: BlueprintNode // 树根节点
  fileCount: number // 扫描到的文件数
  exceededLimit: boolean // 是否超过文件数限制
  warnings: string[] // 警告信息（如权限不足的目录）
}

/**
 * 文件夹选择结果
 */
export interface SelectDirectoryResult {
  canceled: boolean // 用户是否取消
  path?: string // 选中的路径
}

/**
 * 蓝图节点类型
 * 注意：与 Frontend/GUI/pages/MainWindow/MainPanel/Blueprint/types.ts 中的 BlueprintNode 保持一致
 */
export interface BlueprintNode {
  id: string
  name: string
  type: 'directory' | 'blueprint'
  path: string
  isActivated: boolean
  metadata?: Record<string, unknown>
  summary?: string
  children?: BlueprintNode[]
  isLeaf?: boolean
}

