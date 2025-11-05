/**
 * 同步相关跨层级类型定义
 * 用于 Frontend 渲染进程与 Electron 主进程之间的通信
 */

import type { ActiveBlueprintNode } from '@gui/pages/MainWindow/MainPanel/Blueprint/types'
import type { BlueprintSource as ImportedBlueprintSource } from '@gui/pages/MainWindow/MainPanel/Blueprint/types'

// 重新导出 BlueprintSource 用于跨层级通信
export type BlueprintSource = ImportedBlueprintSource

/**
 * 同步模式枚举
 */
export type SyncMode = 'library-to-game' | 'game-to-library'

/**
 * 游戏→库同步策略
 */
export type GameToLibraryMode = 'diff' | 'full' | 'latest' | 'new-version'

/**
 * 蓝图对象（.sbp + .sbpcfg 对）
 */
export interface BlueprintPair {
  sbpPath: string          // .sbp 文件完整路径
  cfgPath: string | null   // .sbpcfg 文件完整路径（可能不存在）
  basename: string         // 文件基础名（不含后缀）
  lastModified: number     // 最后修改时间戳（取 sbp 的 mtime）
}

/**
 * 蓝图索引条目
 */
export interface IndexEntry {
  fullPath: string         // 蓝图在源中的完整路径
  sourceName: string       // 所属源的名称
  relativePath: string     // 相对于源根目录的路径
  lastModified: number     // 索引时的修改时间
}

/**
 * 蓝图索引结构
 * @注意事项 basename 可能对应多个源路径（重名蓝图）
 */
export interface BlueprintIndex {
  version: string                    // 索引版本
  createdAt: number                  // 创建时间
  entries: Record<string, IndexEntry[]> // key = basename（不含后缀），value = 可能的源路径列表
}

/**
 * 同步配置
 */
export interface SyncConfig {
  saveGameBasePath: string           // 存档基础路径（默认：通过 Electron app.getPath('appData') 获取的实际路径）
  selectedSaveGame: string | null    // 当前选中的存档名称
  libraryPath: string                // 默认蓝图库路径（默认：通过 Electron app.getPath('userData') 获取的实际路径）
  backupPath: string                 // 备份目录路径（默认：通过 Electron app.getPath('userData') 获取的实际路径）
  autoBackup: boolean                // 是否自动备份（默认 true）
}

/**
 * 库→游戏同步参数
 */
export interface SyncLibraryToGameParams {
  targetPath: string                 // 游戏存档蓝图目录（完整路径）
  blueprints: ActiveBlueprintNode[]  // 激活的蓝图节点列表
  backupPath?: string                // 备份目录（如果提供，先备份）
}

/**
 * 游戏→库同步参数（简化版：只处理新增蓝图）
 */
export interface SyncGameToLibraryParams {
  sourcePath: string                 // 游戏存档蓝图目录
  targetPath: string                 // 目标目录（蓝图源路径或用户自定义路径）
  blueprints: BlueprintPair[]        // 要同步的新增蓝图列表
}

/**
 * 同步进度
 */
export interface SyncProgress {
  total: number                      // 总文件数
  completed: number                  // 已完成
  failed: number                     // 失败
  skipped: number                    // 跳过
  current: string                    // 当前处理的文件名
}

/**
 * 同步结果
 */
export interface SyncResult {
  succeeded: BlueprintPair[]         // 成功同步的蓝图对
  failed: Array<{ pair: BlueprintPair, error: string }>  // 失败的蓝图对及错误信息
  skipped: Array<{ pair: BlueprintPair, reason: string }> // 跳过的蓝图对及原因
  backupPath?: string                // 备份路径（如果创建了备份）
  duration: number                   // 同步耗时（毫秒）
}

/**
 * 文件占用检测结果
 */
export interface FileLockStatus {
  isLocked: boolean                  // 是否被占用
  lockedBy?: string                  // 占用进程（Windows 可通过 handle.exe 获取，简化版仅返回"游戏进程"）
}

/**
 * 重名蓝图选择对话框输入
 */
export interface DuplicateInfo {
  blueprintName: string              // 蓝图名称
  candidates: IndexEntry[]           // 候选源路径列表
}

/**
 * 用户选择结果
 */
export interface UserChoice {
  action: 'select' | 'skip' | 'fallback'  // 用户选择的操作
  selectedPath?: string              // 选中的路径（仅当 action === 'select' 时）
  applyToAll: boolean                // 是否应用到所有重名蓝图
}

/**
 * 检测新增蓝图结果
 */
export interface NewBlueprintsResult {
  newBlueprints: BlueprintPair[]     // 新增的蓝图列表（不在索引中的）
  totalBlueprints: number             // 游戏目录中的总蓝图数
}

