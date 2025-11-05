import { defineStore } from 'pinia'
import type { ActiveBlueprintNode, ViewType, BlueprintUsageEvent, BlueprintNode } from '../../types'
import type { ActiveBlueprintState, DropType } from './types'
import { activeBlueprintDatasource } from './datasource'
import { configDatasource } from './config-datasource'
// 跨端（Electron IPC）通信的公共类型，必须使用统一导入路径
import type { ConfigFileData } from '@types/config'

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
    // 配置管理相关状态
    currentConfigId: null,
    configList: [],
    treeData: [],
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
     * 删除分组或蓝图节点
     * @param nodeId 要删除的节点 ID
     * @param deleteChildren 是否删除子节点（true：删除，false：移到未分组），默认为 false
     */
    async deleteNode(nodeId: string, deleteChildren: boolean = false): Promise<void> {
      if (!this.hasActiveConfig()) {
        throw new Error('请先创建或选择一个配置')
      }

      try {
        // 查找节点
        const findNode = (nodes: ActiveBlueprintNode[]): ActiveBlueprintNode | null => {
          for (const node of nodes) {
            if (node.id === nodeId) {
              return node
            }
            if (node.children) {
              const found = findNode(node.children)
              if (found) {
                return found
              }
            }
          }
          return null
        }

        // 查找父节点
        const findParent = (nodes: ActiveBlueprintNode[], targetId: string, parent: ActiveBlueprintNode[] | null = null): ActiveBlueprintNode[] | null => {
          for (const node of nodes) {
            if (node.id === targetId) {
              return parent || this.treeData
            }
            if (node.children) {
              const found = findParent(node.children, targetId, node.children)
              if (found) {
                return found
              }
            }
          }
          return null
        }

        const node = findNode(this.treeData)
        if (!node) {
          throw new Error('节点不存在')
        }

        // 检查是否是"未分组"节点，不允许删除
        if (node.id === 'ungrouped' && node.type === 'group') {
          throw new Error('不允许删除"未分组"节点')
        }

        const parentArray = findParent(this.treeData, nodeId)
        if (!parentArray) {
          throw new Error('无法找到父节点')
        }

        // 如果是分组且有子节点
        if (node.type === 'group' && node.children && node.children.length > 0) {
          if (deleteChildren) {
            // 删除子节点：直接删除分组
            const index = parentArray.findIndex(n => n.id === nodeId)
            if (index !== -1) {
              parentArray.splice(index, 1)
            }
          } else {
            // 不删除子节点：将子节点移到"未分组"
            const children = [...node.children] // 复制子节点数组
            
            // 删除分组
            const nodeIndex = parentArray.findIndex(n => n.id === nodeId)
            if (nodeIndex !== -1) {
              parentArray.splice(nodeIndex, 1)
            }

            // 获取或创建"未分组"节点
            let ungroupedNode = this.getUngroupedNode()
            if (!ungroupedNode) {
              ungroupedNode = {
                id: 'ungrouped',
                type: 'group',
                name: '未分组',
                children: [],
              }
              this.treeData.push(ungroupedNode)
            }

            if (!ungroupedNode.children) {
              ungroupedNode.children = []
            }

            // 将子节点添加到"未分组"
            ungroupedNode.children.push(...children)
          }
        } else {
          // 蓝图节点或空分组，直接删除
          const index = parentArray.findIndex(n => n.id === nodeId)
          if (index !== -1) {
            parentArray.splice(index, 1)
          }
        }

        // 更新 rootNode
        this.rootNode = {
          id: 'root',
          name: '根分组',
          type: 'group',
          children: this.treeData,
        }

        // 保存配置
        await this.saveCurrentConfig()
      } catch (error) {
        console.error('Failed to delete node:', error)
        throw error
      }
    },

    /**
     * 删除分组（兼容旧接口）
     */
    async deleteGroup(groupId: string): Promise<void> {
      await this.deleteNode(groupId)
    },

    /**
     * 移动节点（拖拽）
     */
    async moveNode(
      nodeId: string,
      targetId: string,
      dropType: DropType
    ): Promise<void> {
      if (!this.hasActiveConfig()) {
        throw new Error('请先创建或选择一个配置')
      }

      try {
        // 查找节点
        const findNode = (nodes: ActiveBlueprintNode[]): ActiveBlueprintNode | null => {
          for (const node of nodes) {
            if (node.id === nodeId) {
              return node
            }
            if (node.children) {
              const found = findNode(node.children)
              if (found) {
                return found
              }
            }
          }
          return null
        }

        // 查找目标节点
        const findTarget = (nodes: ActiveBlueprintNode[]): ActiveBlueprintNode | null => {
          for (const node of nodes) {
            if (node.id === targetId) {
              return node
            }
            if (node.children) {
              const found = findTarget(node.children)
              if (found) {
                return found
              }
            }
          }
          return null
        }

        // 查找父节点数组
        const findParentArray = (nodes: ActiveBlueprintNode[], targetId: string, parent: ActiveBlueprintNode[] | null = null): ActiveBlueprintNode[] | null => {
          for (const node of nodes) {
            if (node.id === targetId) {
              return parent || this.treeData
            }
            if (node.children) {
              const found = findParentArray(node.children, targetId, node.children)
              if (found) {
                return found
              }
            }
          }
          return null
        }

        const node = findNode(this.treeData)
        const target = findTarget(this.treeData)

        if (!node || !target) {
          throw new Error('节点或目标不存在')
        }

        // 防止拖拽到自己内部
        const isDescendant = (parent: ActiveBlueprintNode, childId: string): boolean => {
          if (parent.id === childId) {
            return true
          }
          if (parent.children) {
            for (const child of parent.children) {
              if (isDescendant(child, childId)) {
                return true
              }
            }
          }
          return false
        }

        if (isDescendant(node, targetId)) {
          throw new Error('不能将节点拖拽到自己的子节点中')
        }

        // 从原位置移除
        const findAndRemove = (nodes: ActiveBlueprintNode[]): boolean => {
          for (let i = 0; i < nodes.length; i++) {
            const currentNode = nodes[i]
            if (!currentNode) {
              continue
            }
            if (currentNode.id === nodeId) {
              nodes.splice(i, 1)
              return true
            }
            const children = currentNode.children
            if (children) {
              if (findAndRemove(children)) {
                return true
              }
            }
          }
          return false
        }

        findAndRemove(this.treeData)

        // 根据 dropType 插入到新位置
        if (dropType === 'inner') {
          // 拖入分组内部
          if (target.type !== 'group') {
            throw new Error('只能拖拽到分组节点内部')
          }
          if (!target.children) {
            target.children = []
          }
          target.children.push(node)
        } else {
          // 拖到目标节点前/后
          const targetParentArray = findParentArray(this.treeData, targetId)
          if (!targetParentArray) {
            throw new Error('无法找到目标节点的父节点')
          }

          const targetIndex = targetParentArray.findIndex(
            (child) => child.id === targetId
          )
          if (targetIndex === -1) {
            throw new Error('目标节点未在父节点中找到')
          }

          const insertIndex = dropType === 'before' ? targetIndex : targetIndex + 1
          targetParentArray.splice(insertIndex, 0, node)
        }

        // 更新 rootNode
        this.rootNode = {
          id: 'root',
          name: '根分组',
          type: 'group',
          children: this.treeData,
        }

        // 保存配置
        await this.saveCurrentConfig()
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

    /**
     * ========== 配置管理相关 Actions ==========
     */

    /**
     * 加载配置列表
     */
    async loadConfigList(): Promise<void> {
      try {
        this.configList = await configDatasource.listConfigs()
      } catch (error) {
        console.error('Failed to load config list:', error)
        throw error
      }
    },

    /**
     * 创建配置
     */
    async createConfig(name: string): Promise<void> {
      try {
        // 生成4位哈希值（基于字符串）
        const generateHash4 = (str: string): string => {
          let hash = 0
          for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash = hash & hash // 转换为32位整数
          }
          // 取绝对值并转换为4位数字（0000-9999）
          const hash4 = Math.abs(hash) % 10000
          return String(hash4).padStart(4, '0')
        }

        // 生成基于名称+4位哈希的ID
        const hash4 = generateHash4(name)
        let id = `${name}-${hash4}`
        
        // 检查ID是否已存在，如果存在则添加时间戳后缀
        const existingConfigs = await configDatasource.listConfigs()
        let attemptCount = 0
        while (existingConfigs.some(c => c.id === id) && attemptCount < 10) {
          // 如果ID冲突，在哈希后添加时间戳的后4位
          const timestampSuffix = String(Date.now()).slice(-4)
          id = `${name}-${hash4}-${timestampSuffix}`
          attemptCount++
        }

        const initialData: ConfigFileData = {
          id,
          name,
          version: '1.0.0',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tree: [{
            id: 'ungrouped',
            type: 'group',
            name: '未分组',
            children: [],
          }],
        }

        await configDatasource.saveConfig(initialData)
        await this.loadConfigList()
        await this.switchConfig(id)
      } catch (error) {
        console.error('Failed to create config:', error)
        throw error
      }
    },

    /**
     * 切换配置
     */
    async switchConfig(configId: string): Promise<void> {
      try {
        // 1. 保存当前配置
        if (this.currentConfigId && this.treeData.length > 0) {
          await this.saveCurrentConfig()
        }

        // 2. 加载新配置
        const configData = await configDatasource.loadConfig(configId)
        if (!configData) {
          throw new Error(`配置加载失败: ${configId}`)
        }

        // 3. 更新状态（确保类型正确）
        this.currentConfigId = configId
        this.treeData = configData.tree as ActiveBlueprintNode[]
        this.rootNode = {
          id: 'root',
          name: '根分组',
          type: 'group',
          children: configData.tree as ActiveBlueprintNode[],
        }

        // 4. 持久化选择
        localStorage.setItem('lastConfigId', configId)
      } catch (error) {
        console.error('Failed to switch config:', error)
        throw error
      }
    },

    /**
     * 保存当前配置
     */
    async saveCurrentConfig(): Promise<void> {
      if (!this.currentConfigId) {
        return
      }

      try {
        const configData = await configDatasource.loadConfig(this.currentConfigId)
        if (!configData) {
          throw new Error(`配置不存在: ${this.currentConfigId}`)
        }

        // 先尝试序列化 treeData，确保没有不可序列化的内容
        let serializedTree: ActiveBlueprintNode[]
        try {
          serializedTree = JSON.parse(JSON.stringify(this.treeData))
        } catch (serializeError) {
          console.error('序列化 treeData 失败:', serializeError)
          console.error('treeData:', this.treeData)
          throw new Error('配置数据包含不可序列化的内容')
        }

        // 创建新的配置对象，确保是可序列化的纯对象
        const serializableConfigData: ConfigFileData = {
          id: configData.id,
          name: configData.name,
          version: configData.version,
          createdAt: configData.createdAt,
          updatedAt: Date.now(),
          tree: serializedTree,
        }

        await configDatasource.saveConfig(serializableConfigData)
      } catch (error) {
        console.error('Failed to save current config:', error)
        throw error
      }
    },

    /**
     * 重命名配置
     */
    async renameConfig(configId: string, newName: string): Promise<void> {
      try {
        await configDatasource.renameConfig(configId, newName)
        await this.loadConfigList()
      } catch (error) {
        console.error('Failed to rename config:', error)
        throw error
      }
    },

    /**
     * 删除配置
     */
    async deleteConfig(configId: string): Promise<void> {
      try {
        await configDatasource.deleteConfig(configId)
        await this.loadConfigList()

        // 如果删除的是当前配置，清空状态
        if (this.currentConfigId === configId) {
          this.currentConfigId = null
          this.treeData = []
          this.rootNode = {
            id: 'root',
            name: '根分组',
            type: 'group',
            children: [],
          }
          localStorage.removeItem('lastConfigId')
        }
      } catch (error) {
        console.error('Failed to delete config:', error)
        throw error
      }
    },

    /**
     * 检查是否有激活的配置
     */
    hasActiveConfig(): boolean {
      return this.currentConfigId !== null
    },

    /**
     * 获取"未分组"节点
     */
    getUngroupedNode(): ActiveBlueprintNode | undefined {
      return this.treeData.find(node => node.id === 'ungrouped' && node.type === 'group')
    },

    /**
     * 初始化配置（应用启动时调用）
     */
    async initializeConfig(): Promise<void> {
      try {
        // 1. 加载配置列表
        await this.loadConfigList()

        // 2. 读取上次使用的配置
        const lastConfigId = localStorage.getItem('lastConfigId')
        if (lastConfigId) {
          const configExists = this.configList.some(c => c.id === lastConfigId)
          if (configExists) {
            await this.switchConfig(lastConfigId)
            return
          }
        }

        // 3. 没有配置或配置不存在，保持空状态
        this.currentConfigId = null
        this.treeData = []
        this.rootNode = {
          id: 'root',
          name: '根分组',
          type: 'group',
          children: [],
        }
      } catch (error) {
        console.error('Failed to initialize config:', error)
        // 失败时保持空状态
        this.currentConfigId = null
        this.treeData = []
      }
    },

    /**
     * 激活单个蓝图（添加到"未分组"）
     */
    async activateBlueprint(node: BlueprintNode): Promise<void> {
      if (!this.hasActiveConfig()) {
        throw new Error('请先创建或选择一个配置')
      }

      try {
        // 检查是否已激活（通过 sourcePath 去重）
        if (this.isBlueprintActivated(node.path)) {
          throw new Error('该蓝图已激活')
        }

        // 获取"未分组"节点
        let ungroupedNode = this.getUngroupedNode()
        if (!ungroupedNode) {
          // 如果没有"未分组"，创建一个
          ungroupedNode = {
            id: 'ungrouped',
            type: 'group',
            name: '未分组',
            children: [],
          }
          this.treeData.push(ungroupedNode)
        }

        if (!ungroupedNode.children) {
          ungroupedNode.children = []
        }

        // 添加到"未分组"
        const activeNode: ActiveBlueprintNode = {
          id: `active-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          type: 'blueprint',
          name: node.name,
          blueprintId: node.id,
          path: node.path,
          sourcePath: node.path,
        }

        ungroupedNode.children.push(activeNode)

        // 更新 rootNode
        this.rootNode = {
          id: 'root',
          name: '根分组',
          type: 'group',
          children: this.treeData,
        }

        // 自动保存
        await this.saveCurrentConfig()
      } catch (error) {
        console.error('Failed to activate blueprint:', error)
        throw error
      }
    },

    /**
     * 检查蓝图是否已激活
     */
    isBlueprintActivated(sourcePath: string): boolean {
      const check = (nodes: ActiveBlueprintNode[]): boolean => {
        for (const node of nodes) {
          if (node.type === 'blueprint' && node.sourcePath === sourcePath) {
            return true
          }
          if (node.children && check(node.children)) {
            return true
          }
        }
        return false
      }
      return check(this.treeData)
    },

    /**
     * 批量激活蓝图（智能分组）
     */
    async batchActivateBlueprints(checkedKeys: string[], sourceTree: BlueprintNode[]): Promise<void> {
      if (!this.hasActiveConfig()) {
        throw new Error('请先创建或选择一个配置')
      }

      try {
        const result = this.buildGroupsFromSelection(checkedKeys, sourceTree)

        // 合并到当前树数据
        for (const group of result.groups) {
          // 检查分组是否已存在
          const existingGroup = this.treeData.find(
            n => n.type === 'group' && n.name === group.name
          )

          if (existingGroup && existingGroup.children) {
            // 合并到现有分组
            for (const blueprint of group.children || []) {
              if (!this.isBlueprintActivated(blueprint.sourcePath || blueprint.path || '')) {
                existingGroup.children.push(blueprint)
              }
            }
          } else {
            // 添加新分组
            this.treeData.push(group)
          }
        }

        // 添加到"未分组"
        const ungrouped = result.ungrouped.filter(
          bp => !this.isBlueprintActivated(bp.sourcePath || bp.path || '')
        )

        if (ungrouped.length > 0) {
          let ungroupedNode = this.getUngroupedNode()
          if (!ungroupedNode) {
            ungroupedNode = {
              id: 'ungrouped',
              type: 'group',
              name: '未分组',
              children: [],
            }
            this.treeData.push(ungroupedNode)
          }

          if (!ungroupedNode.children) {
            ungroupedNode.children = []
          }

          ungroupedNode.children.push(...ungrouped)
        }

        // 更新 rootNode
        this.rootNode = {
          id: 'root',
          name: '根分组',
          type: 'group',
          children: this.treeData,
        }

        // 自动保存
        await this.saveCurrentConfig()
      } catch (error) {
        console.error('Failed to batch activate blueprints:', error)
        throw error
      }
    },

    /**
     * 智能分组算法：根据选中节点构建分组结构
     * 规则：
     * 1. 选中的蓝图节点：添加到其直接父目录分组中
     * 2. 选中的目录节点：创建该目录分组，但只添加该目录下被选中的蓝图节点（不递归添加所有蓝图）
     */
    buildGroupsFromSelection(
      checkedKeys: string[],
      sourceTree: BlueprintNode[]
    ): { groups: ActiveBlueprintNode[]; ungrouped: ActiveBlueprintNode[] } {
      const groupMap = new Map<string, {
        group: ActiveBlueprintNode
        blueprints: BlueprintNode[]
      }>()

      const ungrouped: BlueprintNode[] = []

      // 将 checkedKeys 转换为 Set 以便快速查找
      const checkedKeysSet = new Set(checkedKeys)

      // 查找节点的辅助函数
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

      // 查找父目录节点
      const findParentDirectory = (node: BlueprintNode, allNodes: BlueprintNode[]): BlueprintNode | null => {
        // 提取父目录路径（去掉文件名）
        const normalizedPath = node.path.replace(/\\/g, '/')
        const pathParts = normalizedPath.split('/')
        if (pathParts.length < 2) {
          return null
        }

        const parentPath = pathParts.slice(0, -1).join('/')
        const search = (nodes: BlueprintNode[]): BlueprintNode | null => {
          for (const n of nodes) {
            const normalizedNodePath = n.path.replace(/\\/g, '/')
            if (n.type === 'directory' && normalizedNodePath === parentPath) {
              return n
            }
            if (n.children) {
              const found = search(n.children)
              if (found) {
                return found
              }
            }
          }
          return null
        }
        return search(allNodes)
      }

      // 获取目录下被选中的蓝图节点（只返回被选中的，不递归所有蓝图）
      const getSelectedBlueprintsInDirectory = (dirNode: BlueprintNode, checkedSet: Set<string>): BlueprintNode[] => {
        const blueprints: BlueprintNode[] = []
        
        // 遍历该目录的直接子节点
        if (dirNode.children) {
          for (const child of dirNode.children) {
            // 如果是蓝图节点且被选中，添加到列表
            if (child.type === 'blueprint' && checkedSet.has(child.id)) {
              blueprints.push(child)
            }
            // 如果是目录节点且被选中，递归处理该目录下被选中的蓝图
            else if (child.type === 'directory' && checkedSet.has(child.id)) {
              const subBlueprints = getSelectedBlueprintsInDirectory(child, checkedSet)
              blueprints.push(...subBlueprints)
            }
          }
        }
        
        return blueprints
      }

      // 处理选中的节点
      for (const key of checkedKeys) {
        const node = findNodeById(sourceTree, key)
        if (!node) {
          continue
        }

        if (node.type === 'blueprint') {
          // 蓝图节点：找到父目录作为分组
          const parentDir = findParentDirectory(node, sourceTree)
          if (parentDir) {
            const parentPath = parentDir.path.replace(/\\/g, '/')
            if (!groupMap.has(parentPath)) {
              groupMap.set(parentPath, {
                group: {
                  id: `group-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                  type: 'group',
                  name: parentDir.name,
                  children: [],
                },
                blueprints: [],
              })
            }
            // 只有当该蓝图还未在列表中时才添加（避免重复）
            const existingGroup = groupMap.get(parentPath)!
            if (!existingGroup.blueprints.some(bp => bp.id === node.id)) {
              existingGroup.blueprints.push(node)
            }
          } else {
            // 无法确定父目录，添加到未分组
            ungrouped.push(node)
          }
        } else if (node.type === 'directory') {
          // 目录节点：只获取该目录下被选中的蓝图节点
          const selectedBlueprints = getSelectedBlueprintsInDirectory(node, checkedKeysSet)
          
          // 只有当目录下有被选中的蓝图时，才创建分组
          if (selectedBlueprints.length > 0) {
            const dirPath = node.path.replace(/\\/g, '/')
            groupMap.set(dirPath, {
              group: {
                id: `group-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                type: 'group',
                name: node.name,
                children: [],
              },
              blueprints: selectedBlueprints,
            })
          }
        }
      }

      // 转换为 ActiveBlueprintNode[]
      const groups = Array.from(groupMap.values()).map(item => ({
        ...item.group,
        children: item.blueprints.map(bp => ({
          id: `active-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          type: 'blueprint' as const,
          name: bp.name,
          blueprintId: bp.id,
          path: bp.path,
          sourcePath: bp.path,
        })),
      }))

      const ungroupedNodes = ungrouped.map(bp => ({
        id: `active-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type: 'blueprint' as const,
        name: bp.name,
        blueprintId: bp.id,
        path: bp.path,
        sourcePath: bp.path,
      }))

      return {
        groups,
        ungrouped: ungroupedNodes,
      }
    },
  },
})

