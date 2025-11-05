import type { BlueprintNode } from '../../types'

/**
 * Mock 蓝图源根节点数据
 */
export const mockBlueprintSources: BlueprintNode[] = [
  {
    id: '/source1',
    name: '本地蓝图',
    type: 'directory',
    path: '/source1',
    isActivated: false,
    isLeaf: false,
  },
  {
    id: '/source2',
    name: 'Steam 创意工坊',
    type: 'directory',
    path: '/source2',
    isActivated: false,
    isLeaf: false,
  },
]

/**
 * Mock 子节点数据（按父节点 id 索引）
 */
export const mockChildren: Record<string, BlueprintNode[]> = {
  '/source1': [
    {
      id: '/source1/dir1',
      name: '生产线',
      type: 'directory',
      path: '/source1/dir1',
      isActivated: false,
      isLeaf: false,
    },
    {
      id: '/source1/bp1',
      name: '煤炭发电厂',
      type: 'blueprint',
      path: '/source1/bp1.json',
      isActivated: false,
      isLeaf: true,
      metadata: {
        version: '1.0',
        author: '玩家A',
      },
      summary: '高效的煤炭发电厂设计，包含自动化生产线和资源管理系统。',
    },
    {
      id: '/source1/bp2',
      name: '石油精炼',
      type: 'blueprint',
      path: '/source1/bp2.json',
      isActivated: true,
      isLeaf: true,
      metadata: {
        version: '2.1',
        author: '玩家B',
      },
      summary: '完整的石油精炼流程，支持多种副产品处理和自动化运输。',
    },
  ],
  '/source1/dir1': [
    {
      id: '/source1/dir1/bp3',
      name: '自动化产线',
      type: 'blueprint',
      path: '/source1/dir1/bp3.json',
      isActivated: false,
      isLeaf: true,
      metadata: {
        version: '1.5',
        author: '玩家C',
      },
      summary: '模块化自动化生产线设计，可扩展性强，适合中后期使用。',
    },
  ],
  '/source2': [
    {
      id: '/source2/bp4',
      name: '大型工厂',
      type: 'blueprint',
      path: '/source2/bp4.json',
      isActivated: false,
      isLeaf: true,
      metadata: {
        version: '3.0',
        author: '玩家D',
      },
      summary: '超大型综合工厂蓝图，包含完整的生产链条和物流系统，适合后期大规模生产。',
    },
  ],
}

/**
 * 获取 Mock 子节点（模拟异步加载）
 * @param nodeId 父节点 id
 * @returns Promise<BlueprintNode[]>
 */
export function getMockChildren(nodeId: string): Promise<BlueprintNode[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockChildren[nodeId] || [])
    }, 300) // 模拟 300ms 延迟
  })
}

