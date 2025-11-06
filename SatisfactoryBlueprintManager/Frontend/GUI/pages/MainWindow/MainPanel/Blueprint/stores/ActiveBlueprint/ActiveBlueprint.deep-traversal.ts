/**
 * 深度遍历加载器
 * 职责：检测并深度加载未加载的目录节点
 */
import pLimit from 'p-limit'
import type { BlueprintNode } from '../../types'
import type { LoadedNodesResult } from './types'
import type { useBlueprintSourceStore } from '../BlueprintSource'

/**
 * 深度遍历并加载目录节点
 * @param checkedKeys 选中的节点 id 列表
 * @param sourceTree 蓝图源树根节点
 * @param blueprintSourceStore BlueprintSourceStore 实例
 * @returns LoadedNodesResult 加载结果
 * @注意事项 并发控制为 5，避免过多 IPC 调用
 */
export async function deepTraverseAndLoad(
  checkedKeys: string[],
  sourceTree: BlueprintNode[],
  blueprintSourceStore: ReturnType<typeof useBlueprintSourceStore>
): Promise<LoadedNodesResult> {
  const fullyLoadedKeys: string[] = []
  const loadedDirectories = new Map<string, BlueprintNode>()
  const limit = pLimit(5) // 并发控制：最多同时加载 5 个目录

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
   * 递归加载目录及其子节点
   * @param node 目录节点
   * @param depth 当前深度（防止无限递归，最多 10 层）
   */
  const loadDirectoryRecursive = async (
    node: BlueprintNode,
    depth = 0
  ): Promise<void> => {
    if (depth > 10) {
      console.warn(`目录深度超过 10 层，停止递归: ${node.path}`)
      return
    }

    // 检查是否已加载
    if (node.children !== undefined) {
      // 已加载，直接处理子节点
      loadedDirectories.set(node.id, node)
      await processChildren(node, depth)
      return
    }

    // 未加载，需要加载
    try {
      const children = await limit(() => blueprintSourceStore.loadChildren(node.id))
      node.children = children || []
      loadedDirectories.set(node.id, node)

      // 处理子节点
      await processChildren(node, depth)
    } catch (error) {
      console.error(`加载目录失败: ${node.path}`, error)
      // 即使加载失败，也标记为已加载（避免重复尝试）
      node.children = []
    }
  }

  /**
   * 处理目录的子节点
   */
  const processChildren = async (node: BlueprintNode, depth: number): Promise<void> => {
    if (!node.children) {
      return
    }

    const tasks: Promise<void>[] = []

    for (const child of node.children) {
      if (child.type === 'blueprint') {
        // 蓝图节点：添加到结果列表
        fullyLoadedKeys.push(child.id)
      } else if (child.type === 'directory') {
        // 目录节点：递归加载
        tasks.push(loadDirectoryRecursive(child, depth + 1))
      }
    }

    // 等待所有子目录加载完成
    await Promise.all(tasks)
  }

  // 处理所有选中的节点
  const tasks: Promise<void>[] = []

  for (const key of checkedKeys) {
    const node = findNodeById(sourceTree, key)
    if (!node) {
      continue
    }

    if (node.type === 'blueprint') {
      // 蓝图节点：直接添加
      fullyLoadedKeys.push(node.id)
    } else if (node.type === 'directory') {
      // 目录节点：递归加载
      tasks.push(loadDirectoryRecursive(node))
    }
  }

  // 等待所有目录加载完成
  await Promise.all(tasks)

  return {
    fullyLoadedKeys,
    loadedDirectories,
  }
}

