import type { TagDefinition } from '../../types'

/**
 * 全局标签配置数据结构
 */
export interface GlobalTagsConfig {
  version: string
  tags: TagDefinition[]
  blueprintTags: Record<string, string[]> // key: blueprintPath, value: tagId[]
}

/**
 * 全局标签 Store 状态
 */
export interface GlobalTagsState {
  tags: TagDefinition[]
  blueprintTagsMap: Map<string, string[]> // key: blueprintPath, value: tagId[]
}

