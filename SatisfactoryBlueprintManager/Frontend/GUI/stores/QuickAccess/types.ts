/**
 * 快速访问 Store 类型定义
 */
import type { TagDefinition } from '@gui/pages/MainWindow/MainPanel/Blueprint/types'

/**
 * 快速访问 Store 状态
 */
export interface QuickAccessState {
  tags: TagDefinition[]                        // 全局标签列表（订阅自主窗口）
  blueprintTagsMap: Map<string, string[]>      // 蓝图-标签映射（订阅自主窗口）
  activeFilters: Map<string, 'and' | 'or' | 'not'>  // 当前激活的筛选标签
  recentBlueprints: Array<{ path: string; timestamp: number }>  // 最近使用的蓝图列表（最多10个）
  blueprints: Array<{                          // 蓝图列表（从主窗口获取）
    id: string
    name: string
    path: string
    directoryPath?: string
    tags: string[]
  }>
  viewConfig: {
    iconsPerRow: number                        // 每排图标数，默认4
    iconSize: number                           // 图标大小，默认64px
  }
  isSubscribed: boolean                        // 是否成功订阅主窗口数据
  lastSyncTime: number                         // 最后同步时间戳
}

