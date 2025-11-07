/**
 * Blueprint 模块类型定义
 */

/**
 * 蓝图节点类型
 */
export type BlueprintNodeType = 'directory' | 'blueprint'

/**
 * 蓝图节点基础接口
 * @注意事项 id 必须全局唯一，建议使用文件路径作为 id
 */
export interface BlueprintNode {
  id: string                    // 唯一标识（文件路径）
  name: string                  // 显示名称
  type: BlueprintNodeType       // 节点类型
  path: string                  // 完整路径
  isActivated: boolean          // 是否已激活
  metadata?: Record<string, any> // 元数据（仅蓝图节点）
  summary?: string              // 详细信息摘要（仅蓝图节点）
  children?: BlueprintNode[]    // 子节点（仅目录节点，懒加载前为 undefined）
  isLeaf?: boolean              // 是否为叶子节点（用于懒加载判断）
}

/**
 * 激活蓝图树节点类型
 */
export type ActiveNodeType = 'group' | 'blueprint'

/**
 * 激活蓝图树节点
 * @注意事项 
 * - 分组节点的 children 永远是数组（可能为空）
 * - 蓝图节点的 children 为 undefined
 * - 分组信息独立于文件系统，完全由用户创建
 * - blueprintId 用于取消激活时查找节点（无论节点在哪个分组下）
 * - sourcePath 用于去重，防止重复激活同一蓝图
 * - directoryPath 为目录路径（不含文件名），根据 pathTagLevels 配置提取
 * - 标签关系已解耦到全局标签Store，通过 blueprintPath 查询
 */
export interface ActiveBlueprintNode {
  id: string                    // 唯一标识
  name: string                  // 显示名称
  type: ActiveNodeType          // 节点类型：'group' | 'blueprint'
  blueprintId?: string          // 关联的原始蓝图 id（仅蓝图节点，用于取消激活时查找）
  path?: string                 // 蓝图完整路径（含文件名，仅蓝图节点）
  sourcePath?: string           // 原始蓝图路径（用于去重，仅蓝图节点）
  directoryPath?: string        // 目录路径（不含文件名，根据 pathTagLevels 提取，仅蓝图节点）
  children?: ActiveBlueprintNode[] // 子节点（仅分组节点）
}

/**
 * ActiveBlueprint 树根结构（JSON 格式）
 * @注意事项 未来会存储为 JSON 文件
 */
export interface ActiveBlueprintTree {
  root: ActiveBlueprintNode     // 根节点（虚拟分组）
  version: string               // 数据版本（用于未来迁移）
}

/**
 * 视图类型
 */
export type ViewType = 'tree' | 'icon'

/**
 * 标签定义接口
 * @注意事项 预定义标签列表，未来可扩展为用户自定义
 */
export interface TagDefinition {
  id: string          // 标签唯一ID（如 'building', 'mechanical'）
  name: string        // 标签显示名称
  color: string       // 标签颜色（支持 Element Plus Tag 的 type 或自定义颜色）
}

/**
 * 扩展的激活蓝图节点（添加 tags 字段，用于视图层临时使用）
 * @注意事项 
 * - tags 为标签 ID 数组，不包含路径标签（路径标签自动生成）
 * - 此类型仅用于视图层，标签从全局标签Store查询后临时附加
 * - 不持久化到配置文件
 */
export interface ActiveBlueprintNodeWithTags extends ActiveBlueprintNode {
  tags?: string[]     // 用户添加的标签 ID 列表（临时字段，从全局Store查询）
}

/**
 * 蓝图源配置
 */
export interface BlueprintSource {
  id: string                    // 源 id
  name: string                  // 源名称
  path: string                  // 源路径
  enabled: boolean              // 是否启用
}

/**
 * 蓝图使用事件
 */
export interface BlueprintUsageEvent {
  blueprintId: string
  blueprintPath: string
  timestamp: number
}

