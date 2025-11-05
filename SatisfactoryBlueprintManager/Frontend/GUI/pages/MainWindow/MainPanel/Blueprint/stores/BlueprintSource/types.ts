import type { BlueprintNode, BlueprintSource } from '../../types'

/**
 * BlueprintSource Store 状态
 */
export interface BlueprintSourceState {
  sources: BlueprintSource[]    // 蓝图源列表
  treeData: BlueprintNode[]     // 树根节点数据
  checkedKeys: string[]          // 选中的节点 key
  expandedKeys: string[]         // 展开的节点 key
  loading: boolean              // 加载状态
}

/**
 * 懒加载函数参数
 */
export interface LazyLoadParams {
  node: any                     // Element Plus TreeNode 对象
  resolve: (data: BlueprintNode[]) => void
  reject?: (error: Error) => void
}

/**
 * BlueprintSource 数据源适配器接口
 * @注意事项 所有方法返回 Promise，便于后续切换到异步数据源
 */
export interface IBlueprintSourceDatasource {
  /**
   * 获取所有蓝图源
   */
  getSources(): Promise<BlueprintSource[]>

  /**
   * 获取根节点列表
   */
  getRootNodes(): Promise<BlueprintNode[]>

  /**
   * 懒加载子节点
   * @param nodeId 父节点 id
   */
  getChildren(nodeId: string): Promise<BlueprintNode[]>

  /**
   * 激活蓝图
   * @param nodeId 蓝图节点 id
   * @注意事项 激活后会触发 ActiveBlueprintStore 更新
   */
  activateBlueprint(nodeId: string): Promise<void>

  /**
   * 取消激活蓝图
   * @param nodeId 蓝图节点 id
   */
  deactivateBlueprint(nodeId: string): Promise<void>

  /**
   * 添加蓝图源
   * @param source 蓝图源配置
   */
  addSource(source: BlueprintSource): Promise<void>

  /**
   * 刷新蓝图源
   * @param sourceId 源 id，不传则刷新所有
   */
  refresh(sourceId?: string): Promise<void>
}
