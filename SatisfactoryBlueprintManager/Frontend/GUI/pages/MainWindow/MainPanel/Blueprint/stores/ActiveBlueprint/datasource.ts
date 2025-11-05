import type { ActiveBlueprintNode } from '../../types'
import type { DropType, IActiveBlueprintDatasource } from './types'
import { getMockActiveTree, saveMockActiveTree, mockActiveBlueprintTree } from './mock'

/**
 * 在树中查找节点（深度优先搜索）
 */
function findNodeById(
  node: ActiveBlueprintNode,
  targetId: string
): ActiveBlueprintNode | null {
  if (node.id === targetId) {
    return node
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, targetId)
      if (found) {
        return found
      }
    }
  }
  return null
}

/**
 * 在树中查找节点的父节点
 */
function findParentNode(
  root: ActiveBlueprintNode,
  targetId: string,
  parent: ActiveBlueprintNode | null = null
): ActiveBlueprintNode | null {
  if (root.id === targetId) {
    return parent
  }
  if (root.children) {
    for (const child of root.children) {
      const found = findParentNode(child, targetId, root)
      if (found !== null) {
        return found
      }
    }
  }
  return null
}

/**
 * 通过 blueprintId 查找节点（用于取消激活）
 */
function findNodeByBlueprintId(
  node: ActiveBlueprintNode,
  blueprintId: string
): ActiveBlueprintNode | null {
  if (node.type === 'blueprint' && node.blueprintId === blueprintId) {
    return node
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeByBlueprintId(child, blueprintId)
      if (found) {
        return found
      }
    }
  }
  return null
}

/**
 * 删除节点（从父节点的 children 中移除）
 */
function removeNodeFromParent(
  root: ActiveBlueprintNode,
  nodeId: string
): boolean {
  const parent = findParentNode(root, nodeId)
  if (parent && parent.children) {
    const index = parent.children.findIndex((child) => child.id === nodeId)
    if (index !== -1) {
      parent.children.splice(index, 1)
      return true
    }
  }
  return false
}

/**
 * ActiveBlueprint 数据源适配器（Mock 实现）
 */
class ActiveBlueprintDatasource implements IActiveBlueprintDatasource {
  /**
   * 获取激活蓝图树（包含根节点）
   */
  async getActiveTree(): Promise<ActiveBlueprintNode> {
    return getMockActiveTree()
  }

  /**
   * 保存激活蓝图树
   */
  async saveActiveTree(tree: ActiveBlueprintNode): Promise<void> {
    return saveMockActiveTree(tree)
  }

  /**
   * 添加激活蓝图到根节点
   */
  async addBlueprint(
    blueprintId: string,
    name: string,
    path: string
  ): Promise<void> {
    const tree = await this.getActiveTree()
    if (!tree.children) {
      tree.children = []
    }

    // 检查是否已存在
    const existing = findNodeByBlueprintId(tree, blueprintId)
    if (existing) {
      return // 已存在，不重复添加
    }

    // 创建新节点
    const newNode: ActiveBlueprintNode = {
      id: `active-bp-${Date.now()}`,
      name,
      type: 'blueprint',
      blueprintId,
      path,
    }

    tree.children.push(newNode)
    await this.saveActiveTree(tree)
  }

  /**
   * 移除激活蓝图
   * @param blueprintId 原始蓝图 id（不是节点 id）
   */
  async removeBlueprint(blueprintId: string): Promise<void> {
    const tree = await this.getActiveTree()
    const node = findNodeByBlueprintId(tree, blueprintId)
    if (node) {
      removeNodeFromParent(tree, node.id)
      await this.saveActiveTree(tree)
    }
  }

  /**
   * 创建分组
   */
  async createGroup(
    parentId: string | null,
    name: string
  ): Promise<string> {
    const tree = await this.getActiveTree()
    const parent = parentId ? findNodeById(tree, parentId) : tree

    if (!parent || parent.type !== 'group') {
      throw new Error('Invalid parent node')
    }

    if (!parent.children) {
      parent.children = []
    }

    const newGroupId = `group-${Date.now()}`
    const newGroup: ActiveBlueprintNode = {
      id: newGroupId,
      name,
      type: 'group',
      children: [],
    }

    parent.children.push(newGroup)
    await this.saveActiveTree(tree)
    return newGroupId
  }

  /**
   * 删除分组（子节点自动上移）
   */
  async deleteGroup(groupId: string): Promise<void> {
    const tree = await this.getActiveTree()
    const group = findNodeById(tree, groupId)

    if (!group || group.type !== 'group') {
      throw new Error('Invalid group node')
    }

    const parent = findParentNode(tree, groupId)
    if (!parent || !parent.children) {
      throw new Error('Cannot find parent node')
    }

    // 将子节点移到父节点
    const children = group.children || []
    const groupIndex = parent.children.findIndex((child) => child.id === groupId)
    if (groupIndex !== -1) {
      // 在分组位置插入子节点
      parent.children.splice(groupIndex, 1, ...children)
    }

    await this.saveActiveTree(tree)
  }

  /**
   * 移动节点（拖拽）
   */
  async moveNode(
    nodeId: string,
    targetId: string,
    dropType: DropType
  ): Promise<void> {
    const tree = await this.getActiveTree()
    const node = findNodeById(tree, nodeId)
    const target = findNodeById(tree, targetId)

    if (!node || !target) {
      throw new Error('Invalid node or target')
    }

    // 从原位置移除
    removeNodeFromParent(tree, nodeId)

    // 根据 dropType 插入到新位置
    if (dropType === 'inner') {
      // 拖入分组内部
      if (target.type !== 'group') {
        throw new Error('Cannot drop into non-group node')
      }
      if (!target.children) {
        target.children = []
      }
      target.children.push(node)
    } else {
      // 拖到目标节点前/后
      const targetParent = findParentNode(tree, targetId)
      if (!targetParent || !targetParent.children) {
        throw new Error('Cannot find target parent')
      }

      const targetIndex = targetParent.children.findIndex(
        (child) => child.id === targetId
      )
      if (targetIndex === -1) {
        throw new Error('Target node not found in parent')
      }

      const insertIndex = dropType === 'before' ? targetIndex : targetIndex + 1
      targetParent.children.splice(insertIndex, 0, node)
    }

    await this.saveActiveTree(tree)
  }
}

export const activeBlueprintDatasource = new ActiveBlueprintDatasource()

