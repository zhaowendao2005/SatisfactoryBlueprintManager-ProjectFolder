import type { ActiveBlueprintNode } from '../../types'

/**
 * ActiveBlueprint Mock 数据
 * @注意事项 
 * - 当前使用纯状态（内存对象）
 * - 未来替换为 JSON 文件读取/写入
 */
export let mockActiveBlueprintTree: ActiveBlueprintNode = {
  id: 'root',
  name: '根分组',
  type: 'group',
  children: [
    // 用户创建的分组
    {
      id: 'group-1',
      name: '我的分组',
      type: 'group',
      children: [
        // 激活的蓝图
        {
          id: 'active-bp-1',
          name: '石油精炼',
          type: 'blueprint',
          blueprintId: '/source1/bp2', // 关联原始蓝图 id
          path: '/source1/bp2.json',
        },
      ],
    },
    // 直接激活的蓝图（在根节点下，示例中暂时为空）
  ],
}

/**
 * 获取 Mock 激活蓝图树
 */
export function getMockActiveTree(): Promise<ActiveBlueprintNode> {
  return Promise.resolve(mockActiveBlueprintTree)
}

/**
 * 保存 Mock 激活蓝图树
 */
export function saveMockActiveTree(tree: ActiveBlueprintNode): Promise<void> {
  mockActiveBlueprintTree = tree
  return Promise.resolve()
}

