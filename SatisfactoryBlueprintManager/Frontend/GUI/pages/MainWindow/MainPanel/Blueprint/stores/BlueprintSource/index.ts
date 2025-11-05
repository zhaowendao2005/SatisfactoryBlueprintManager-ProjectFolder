import { defineStore } from 'pinia'
import type { BlueprintNode } from '../../types'
import type { BlueprintSourceState } from './types'
import { blueprintSourceDatasource } from './datasource'
import { useActiveBlueprintStore } from '../ActiveBlueprint'

/**
 * BlueprintSource Store
 */
export const useBlueprintSourceStore = defineStore('blueprintSource', {
  state: (): BlueprintSourceState => ({
    sources: [],
    treeData: [],
    checkedKeys: [],
    expandedKeys: [],
    loading: false,
  }),

  actions: {
    /**
     * 加载根节点
     */
    async loadRootNodes(): Promise<void> {
      this.loading = true
      try {
        const sources = await blueprintSourceDatasource.getSources()
        const rootNodes = await blueprintSourceDatasource.getRootNodes()
        this.sources = sources
        this.treeData = rootNodes
      } catch (error) {
        console.error('Failed to load root nodes:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 懒加载子节点
     */
    async loadChildren(nodeId: string): Promise<BlueprintNode[]> {
      try {
        const children = await blueprintSourceDatasource.getChildren(nodeId)
        // 更新树数据（需要在树中找到对应节点并更新）
        this.updateNodeChildren(nodeId, children)
        return children
      } catch (error) {
        console.error('Failed to load children:', error)
        throw error
      }
    },

    /**
     * 更新节点的子节点
     */
    updateNodeChildren(nodeId: string, children: BlueprintNode[]): void {
      const updateNode = (nodes: BlueprintNode[]): boolean => {
        for (const node of nodes) {
          if (node.id === nodeId) {
            node.children = children
            return true
          }
          if (node.children && updateNode(node.children)) {
            return true
          }
        }
        return false
      }
      updateNode(this.treeData)
    },

    /**
     * 激活蓝图
     */
    async activateBlueprint(nodeId: string): Promise<void> {
      try {
        // 找到节点
        const node = this.findNodeById(nodeId)
        if (!node || node.type !== 'blueprint') {
          throw new Error('Invalid blueprint node')
        }

        if (node.isActivated) {
          console.warn('Blueprint already activated:', nodeId)
          return
        }

        // 更新节点状态
        node.isActivated = true

        // 通知 ActiveBlueprintStore 添加蓝图
        const activeBlueprintStore = useActiveBlueprintStore()
        await activeBlueprintStore.addActivatedBlueprint({
          blueprintId: node.id,
          name: node.name,
          path: node.path,
        })

        // 调用 datasource（未来可能需要）
        await blueprintSourceDatasource.activateBlueprint(nodeId)
      } catch (error) {
        console.error('Failed to activate blueprint:', error)
        throw error
      }
    },

    /**
     * 取消激活蓝图
     */
    async deactivateBlueprint(nodeId: string): Promise<void> {
      try {
        // 找到节点
        const node = this.findNodeById(nodeId)
        if (!node || node.type !== 'blueprint') {
          throw new Error('Invalid blueprint node')
        }

        if (!node.isActivated) {
          console.warn('Blueprint not activated:', nodeId)
          return
        }

        // 更新节点状态
        node.isActivated = false

        // 通知 ActiveBlueprintStore 移除蓝图
        const activeBlueprintStore = useActiveBlueprintStore()
        await activeBlueprintStore.removeActivatedBlueprint(node.id)

        // 调用 datasource（未来可能需要）
        await blueprintSourceDatasource.deactivateBlueprint(nodeId)
      } catch (error) {
        console.error('Failed to deactivate blueprint:', error)
        throw error
      }
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
     * 添加蓝图源
     */
    async addSource(source: { name: string; path: string }): Promise<void> {
      try {
        const newSource = {
          id: `source-${Date.now()}`,
          name: source.name,
          path: source.path,
          enabled: true,
        }
        await blueprintSourceDatasource.addSource(newSource)
        await this.loadRootNodes() // 重新加载
      } catch (error) {
        console.error('Failed to add source:', error)
        throw error
      }
    },

    /**
     * 刷新蓝图源
     */
    async refresh(sourceId?: string): Promise<void> {
      try {
        await blueprintSourceDatasource.refresh(sourceId)
        await this.loadRootNodes() // 重新加载
      } catch (error) {
        console.error('Failed to refresh:', error)
        throw error
      }
    },

    /**
     * 查找节点（递归）
     */
    findNodeById(nodeId: string): BlueprintNode | undefined {
      const search = (nodes: BlueprintNode[]): BlueprintNode | undefined => {
        for (const node of nodes) {
          if (node.id === nodeId) {
            return node
          }
          if (node.children) {
            const found = search(node.children)
            if (found) {
              return found
            }
          }
        }
        return undefined
      }
      return search(this.treeData)
    },
  },
})

