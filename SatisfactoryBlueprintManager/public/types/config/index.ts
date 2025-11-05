/**
 * 配置管理相关类型定义（跨层级）
 * 用于 Frontend 和 src-electron 之间的 IPC 通信
 */

import type { ActiveBlueprintNode } from '../../../Frontend/GUI/pages/MainWindow/MainPanel/Blueprint/types'

/**
 * 配置文件元信息
 * @注意事项 id 是文件名（不含 .json），不可重复
 */
export interface ConfigMeta {
  id: string          // 配置 id（文件名，不含 .json）
  name: string        // 配置显示名称
  createdAt: number   // 创建时间戳
  updatedAt: number   // 更新时间戳
}

/**
 * 配置文件完整数据
 * @注意事项 存储在 {userData}/Data/{id}.json
 */
export interface ConfigFileData {
  id: string                    // 配置 id
  name: string                  // 配置名称
  version: string               // 配置文件版本，初始 "1.0.0"
  createdAt: number             // 创建时间戳
  updatedAt: number             // 更新时间戳
  tree: ActiveBlueprintNode[]   // 激活的蓝图树（包含"未分组"）
}

