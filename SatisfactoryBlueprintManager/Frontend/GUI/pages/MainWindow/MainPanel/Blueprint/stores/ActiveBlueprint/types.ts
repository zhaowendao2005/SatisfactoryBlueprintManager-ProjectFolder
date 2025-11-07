import type { ActiveBlueprintNode, ViewType, BlueprintNode } from '../../types'
import type { ConfigMeta } from './config-datasource'

/**
 * 深度遍历加载器的返回结果
 * @注意事项 fullyLoadedKeys 仅包含蓝图节点 id，不包含目录节点
 */
export interface LoadedNodesResult {
  fullyLoadedKeys: string[]                    // 完全加载后的所有蓝图节点 id
  loadedDirectories: Map<string, BlueprintNode> // 已加载的目录节点（key=nodeId）
}

/**
 * 增强智能分组构建器的返回结果
 * @注意事项 groups 中的分组节点可能包含多层嵌套（保留源目录结构）
 */
export interface GroupStructure {
  groups: ActiveBlueprintNode[]     // 分组节点（包含子目录和蓝图）
  ungrouped: ActiveBlueprintNode[]  // 未分组蓝图（选中单个蓝图无父目录时）
}

/**
 * 重复蓝图映射表
 * @注意事项 
 * - key 为蓝图的物理路径（sourcePath）
 * - value 为所有激活该蓝图的节点 id 数组
 * - 仅包含 length > 1 的条目（真正重复的）
 */
export type DuplicateMap = Map<string, string[]>

/**
 * 颜色映射表
 * @注意事项 颜色值为 CSS 兼容格式（hex 或 hsl）
 */
export type ColorMap = Map<string, string>

/**
 * 标签定义
 */
export interface TagDefinitionInStore {
  id: string
  name: string
  color: string
}

/**
 * ActiveBlueprint Store 状态
 */
export interface ActiveBlueprintState {
  rootNode: ActiveBlueprintNode // 根节点（虚拟分组）
  currentView: ViewType         // 当前视图类型
  checkedKeys: string[]         // 选中的节点 key
  expandedKeys: string[]        // 展开的节点 key
  // 配置管理相关状态
  currentConfigId: string | null  // 当前选中的配置 id
  configList: ConfigMeta[]         // 配置列表
  treeData: ActiveBlueprintNode[]  // 当前配置的树数据（不包含虚拟根节点）
  tags: TagDefinitionInStore[]     // 当前配置的标签列表
  pathTagLevels: number            // 路径追踪级数（默认 3，范围 1-6）
  // 重复检测相关状态
  duplicateMap: DuplicateMap      // 重复蓝图映射表（响应式）
  colorMap: ColorMap               // 颜色映射表（响应式）
}

/**
 * 拖拽放置类型
 */
export type DropType = 'before' | 'after' | 'inner'

/**
 * 拖拽事件参数
 */
export interface DragEventParams {
  draggingNode: any             // 被拖拽的节点
  dropNode: any                 // 目标节点
  dropType: DropType            // 放置类型
}

/**
 * ActiveBlueprint 数据源适配器接口
 * @注意事项 
 * - Mock 阶段：使用纯状态（内存中的对象）
 * - 未来阶段：存储为 JSON 文件（通过 Electron IPC）
 * - 分组信息完全独立，与文件系统无关
 */
export interface IActiveBlueprintDatasource {
  /**
   * 获取激活蓝图树（包含根节点）
   * @注意事项 Mock 阶段返回内存中的状态，未来从 JSON 文件读取
   */
  getActiveTree(): Promise<ActiveBlueprintNode>

  /**
   * 保存激活蓝图树
   * @param tree 完整树结构
   * @注意事项 Mock 阶段仅更新内存状态，未来保存到 JSON 文件
   */
  saveActiveTree(tree: ActiveBlueprintNode): Promise<void>

  /**
   * 添加激活蓝图到根节点
   * @param blueprintId 原始蓝图 id（用于取消激活时查找）
   * @param name 显示名称
   * @param path 蓝图路径
   * @注意事项 蓝图被激活时调用，添加到根节点下
   */
  addBlueprint(blueprintId: string, name: string, path: string): Promise<void>

  /**
   * 移除激活蓝图
   * @param blueprintId 原始蓝图 id（不是节点 id）
   * @注意事项 无论蓝图在哪个分组下，都能找到并删除
   */
  removeBlueprint(blueprintId: string): Promise<void>

  /**
   * 创建分组
   * @param parentId 父节点 id（null 表示根节点）
   * @param name 分组名称
   */
  createGroup(parentId: string | null, name: string): Promise<string>

  /**
   * 删除分组（子节点自动上移）
   * @param groupId 分组 id
   */
  deleteGroup(groupId: string): Promise<void>

  /**
   * 移动节点（拖拽）
   * @param nodeId 被移动的节点 id
   * @param targetId 目标节点 id
   * @param dropType 放置类型
   */
  moveNode(nodeId: string, targetId: string, dropType: DropType): Promise<void>
}
