/**
 * 增强智能分组构建器
 * 职责：基于完全加载的节点构建分组结构，保留源目录层级
 */
import type { BlueprintNode, ActiveBlueprintNode } from '../../types'
import type { GroupStructure } from './types'

/**
 * 构建增强分组结构
 * @param fullyLoadedKeys 完全加载后的蓝图节点 id 列表
 * @param sourceTree 蓝图源树
 * @param loadedDirectories 已加载的目录节点映射
 * @returns GroupStructure 分组结构
 */
export function buildEnhancedGroupStructure(
  fullyLoadedKeys: string[],
  sourceTree: BlueprintNode[],
  loadedDirectories: Map<string, BlueprintNode>
): GroupStructure {
  const groups: ActiveBlueprintNode[] = []
  const ungrouped: ActiveBlueprintNode[] = []

  /**
   * 查找节点
   */
  const findNodeById = (nodes: BlueprintNode[], id: string): BlueprintNode | null => {
    for (const node of nodes) {
      if (node.id === id) {
        return node
      }
      if (node.children) {
        const found = findNodeById(node.children, id)
        if (found) {
          return found
        }
      }
    }
    return null
  }

  /**
   * 查找节点的父目录路径链（从根到该节点）
   */
  const findParentPathChain = (node: BlueprintNode): BlueprintNode[] => {
    const chain: BlueprintNode[] = []
    const normalizedPath = node.path.replace(/\\/g, '/')
    const pathParts = normalizedPath.split('/').filter(Boolean)

    // 从根节点开始查找
    const search = (nodes: BlueprintNode[], currentPath: string[]): boolean => {
      for (const n of nodes) {
        const normalizedNodePath = n.path.replace(/\\/g, '/')
        const nodePathParts = normalizedNodePath.split('/').filter(Boolean)

        // 检查是否是当前路径的父目录
        if (
          n.type === 'directory' &&
          nodePathParts.length < pathParts.length &&
          pathParts.slice(0, nodePathParts.length).join('/') ===
            nodePathParts.join('/')
        ) {
          chain.push(n)

          // 如果已经到达目标节点的直接父目录，停止
          if (nodePathParts.length === pathParts.length - 1) {
            return true
          }

          // 继续在子节点中查找
          if (n.children) {
            if (search(n.children, currentPath)) {
              return true
            }
          }
        }
      }
      return false
    }

    search(sourceTree, [])
    return chain
  }

  /**
   * 构建或获取目录节点（只在当前层级查找，避免循环引用）
   */
  const getOrCreateDirectoryNode = (
    dirPath: string,
    dirName: string,
    currentLevelNodes: ActiveBlueprintNode[]
  ): ActiveBlueprintNode => {
    // 只在当前层级查找（避免循环引用）
    const existing = currentLevelNodes.find(
      (node) => node.type === 'group' && node.name === dirName
    )
    
    if (existing) {
      return existing
    }

    // 创建新目录节点
    const newDir: ActiveBlueprintNode = {
      id: `group-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: 'group',
      name: dirName,
      children: [],
    }

    return newDir
  }

  /**
   * 将蓝图节点添加到目录结构中
   */
  const addBlueprintToStructure = (
    blueprintNode: BlueprintNode,
    parentChain: BlueprintNode[]
  ): void => {
    if (parentChain.length === 0) {
      // 无父目录，添加到未分组
      ungrouped.push({
        id: `active-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type: 'blueprint',
        name: blueprintNode.name,
        blueprintId: blueprintNode.id,
        path: blueprintNode.path,
        sourcePath: blueprintNode.path,
      })
      return
    }

    // 构建目录层级结构
    let currentLevel = groups

    for (let i = 0; i < parentChain.length; i++) {
      const parentDir = parentChain[i]
      if (!parentDir) {
        continue
      }

      const dirPath = parentDir.path.replace(/\\/g, '/')
      const dirNode = getOrCreateDirectoryNode(dirPath, parentDir.name, currentLevel)

      // 检查是否已在当前层级（dirNode 可能是新创建的或已存在的）
      const existingIndex = currentLevel.findIndex((node) => node.id === dirNode.id)
      
      if (existingIndex === -1) {
        // 新创建的节点，添加到当前层级
        currentLevel.push(dirNode)
      }
      
      // 移动到下一层级
      if (!dirNode.children) {
        dirNode.children = []
      }
      currentLevel = dirNode.children
    }

    // 添加蓝图节点到最深层级
    const activeBlueprint: ActiveBlueprintNode = {
      id: `active-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: 'blueprint',
      name: blueprintNode.name,
      blueprintId: blueprintNode.id,
      path: blueprintNode.path,
      sourcePath: blueprintNode.path,
    }

    currentLevel.push(activeBlueprint)
  }

  // 处理所有蓝图节点
  for (const key of fullyLoadedKeys) {
    const blueprintNode = findNodeById(sourceTree, key)
    if (!blueprintNode || blueprintNode.type !== 'blueprint') {
      continue
    }

    // 查找父目录链
    const parentChain = findParentPathChain(blueprintNode)

    // 添加到结构中
    addBlueprintToStructure(blueprintNode, parentChain)
  }

  return {
    groups,
    ungrouped,
  }
}

