import { defineStore } from 'pinia'
import type { ActiveBlueprintNode, ViewType, BlueprintUsageEvent } from '../../types'
import type { ActiveBlueprintState, DropType } from './types'
import { activeBlueprintDatasource } from './datasource'

/**
 * ActiveBlueprint Store
 */
export const useActiveBlueprintStore = defineStore('activeBlueprint', {
  state: (): ActiveBlueprintState => ({
    rootNode: {
      id: 'root',
      name: '根分组',
      type: 'group',
      children: [],
    },
    currentView: 'tree',
    checkedKeys: [],
    expandedKeys: [],
  }),

  actions: {
    /**
     * 加载激活蓝图树
     */
    async loadActiveTree(): Promise<void> {
      try {
        const tree = await activeBlueprintDatasource.getActiveTree()
        this.rootNode = tree
      } catch (error) {
        console.error('Failed to load active tree:', error)
        throw error
      }
    },

    /**
     * 添加激活蓝图（由 BlueprintSourceStore 调用）
     */
    async addActivatedBlueprint(blueprint: {
      blueprintId: string
      name: string
      path: string
    }): Promise<void> {
      try {
        await activeBlueprintDatasource.addBlueprint(
          blueprint.blueprintId,
          blueprint.name,
          blueprint.path
        )
        // 重新加载树
        await this.loadActiveTree()
      } catch (error) {
        console.error('Failed to add activated blueprint:', error)
        throw error
      }
    },

    /**
     * 移除激活蓝图（由 BlueprintSourceStore 调用）
     */
    async removeActivatedBlueprint(blueprintId: string): Promise<void> {
      try {
        await activeBlueprintDatasource.removeBlueprint(blueprintId)
        // 重新加载树
        await this.loadActiveTree()
      } catch (error) {
        console.error('Failed to remove activated blueprint:', error)
        throw error
      }
    },

    /**
     * 创建分组
     */
    async createGroup(parentId: string | null, name: string): Promise<void> {
      try {
        await activeBlueprintDatasource.createGroup(parentId, name)
        await this.loadActiveTree()
      } catch (error) {
        console.error('Failed to create group:', error)
        throw error
      }
    },

    /**
     * 删除分组
     */
    async deleteGroup(groupId: string): Promise<void> {
      try {
        await activeBlueprintDatasource.deleteGroup(groupId)
        await this.loadActiveTree()
      } catch (error) {
        console.error('Failed to delete group:', error)
        throw error
      }
    },

    /**
     * 移动节点（拖拽）
     */
    async moveNode(
      nodeId: string,
      targetId: string,
      dropType: DropType
    ): Promise<void> {
      try {
        await activeBlueprintDatasource.moveNode(nodeId, targetId, dropType)
        await this.loadActiveTree()
      } catch (error) {
        console.error('Failed to move node:', error)
        throw error
      }
    },

    /**
     * 切换视图
     */
    switchView(view: ViewType): void {
      this.currentView = view
    },

    /**
     * 使用蓝图
     */
    useBlueprint(nodeId: string): void {
      const node = this.findNodeById(nodeId)
      if (!node || node.type !== 'blueprint') {
        console.warn('Invalid blueprint node:', nodeId)
        return
      }

      const event: BlueprintUsageEvent = {
        blueprintId: node.blueprintId || node.id,
        blueprintPath: node.path || '',
        timestamp: Date.now(),
      }

      // 当前阶段仅 console.log，未来触发事件
      console.log('Use blueprint:', event)
    },

    /**
     * 复选框状态变化
     */
    checkNode(nodeId: string, checked: boolean): void {
      if (checked) {
        if (!this.checkedKeys.includes(nodeId)) {
          this.checkedKeys.push(nodeId)
        }
      } else {
        const index = this.checkedKeys.indexOf(nodeId)
        if (index !== -1) {
          this.checkedKeys.splice(index, 1)
        }
      }
    },

    /**
     * 查找节点（递归）
     */
    findNodeById(nodeId: string): ActiveBlueprintNode | undefined {
      const search = (node: ActiveBlueprintNode): ActiveBlueprintNode | undefined => {
        if (node.id === nodeId) {
          return node
        }
        if (node.children) {
          for (const child of node.children) {
            const found = search(child)
            if (found) {
              return found
            }
          }
        }
        return undefined
      }
      return search(this.rootNode)
    },
  },
})

