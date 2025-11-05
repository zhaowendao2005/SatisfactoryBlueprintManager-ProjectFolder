import type { BlueprintNode, BlueprintSource } from '../../types'
import type { IBlueprintSourceDatasource } from './types'
import { mockBlueprintSources, getMockChildren } from './mock'

/**
 * BlueprintSource 数据源适配器（Mock 实现）
 */
class BlueprintSourceDatasource implements IBlueprintSourceDatasource {
  /**
   * 获取所有蓝图源
   */
  async getSources(): Promise<BlueprintSource[]> {
    // Mock 阶段：返回硬编码的源列表
    return Promise.resolve([
      {
        id: 'source1',
        name: '本地蓝图',
        path: '/source1',
        enabled: true,
      },
      {
        id: 'source2',
        name: 'Steam 创意工坊',
        path: '/source2',
        enabled: true,
      },
    ])
  }

  /**
   * 获取根节点列表
   */
  async getRootNodes(): Promise<BlueprintNode[]> {
    return Promise.resolve(mockBlueprintSources)
  }

  /**
   * 懒加载子节点
   */
  async getChildren(nodeId: string): Promise<BlueprintNode[]> {
    return getMockChildren(nodeId)
  }

  /**
   * 激活蓝图
   * @注意事项 激活后会触发 ActiveBlueprintStore 更新（由 Store 层处理）
   */
  async activateBlueprint(nodeId: string): Promise<void> {
    // Mock 阶段：仅返回成功，实际更新由 Store 处理
    return Promise.resolve()
  }

  /**
   * 取消激活蓝图
   */
  async deactivateBlueprint(nodeId: string): Promise<void> {
    // Mock 阶段：仅返回成功，实际更新由 Store 处理
    return Promise.resolve()
  }

  /**
   * 添加蓝图源
   */
  async addSource(source: BlueprintSource): Promise<void> {
    // Mock 阶段：仅返回成功
    return Promise.resolve()
  }

  /**
   * 刷新蓝图源
   */
  async refresh(sourceId?: string): Promise<void> {
    // Mock 阶段：仅返回成功
    return Promise.resolve()
  }
}

export const blueprintSourceDatasource = new BlueprintSourceDatasource()

