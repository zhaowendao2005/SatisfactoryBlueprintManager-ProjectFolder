/**
 * 快速访问 Store
 * @注意事项 只读Store，所有数据来自IPC订阅
 */
import { defineStore } from 'pinia'
import { computed } from 'vue'
import type { QuickAccessState } from './types'
import type { TagDefinition, ActiveBlueprintNodeWithTags } from '@gui/pages/MainWindow/MainPanel/Blueprint/types'
import { filterBlueprintsByTags } from '@gui/pages/MainWindow/MainPanel/Blueprint/utils/tagHelpers'

/**
 * 快速访问 Store
 */
export const useQuickAccessStore = defineStore('quickAccess', {
  state: (): QuickAccessState => ({
    tags: [],
    blueprintTagsMap: new Map<string, string[]>(),
    activeFilters: new Map<string, 'and' | 'or' | 'not'>(),
    recentBlueprints: [],
    viewConfig: {
      iconsPerRow: 4,
      iconSize: 64,
    },
    isSubscribed: false,
    lastSyncTime: 0,
    blueprints: [], // 蓝图列表（从主窗口获取）
  }),

  getters: {
    /**
     * 获取最近使用的蓝图列表（带名称）
     */
    recentBlueprintsWithNames: (state) => {
      return state.recentBlueprints.map((item) => {
        const pathParts = item.path.split(/[/\\]/)
        const fileName = pathParts[pathParts.length - 1] || item.path
        const name = fileName.replace(/\.(sbp|sbpcfg)$/i, '')
        return {
          path: item.path,
          name,
          timestamp: item.timestamp,
        }
      })
    },

    /**
     * 获取所有标签（用户标签 + 动态路径标签）
     */
    getAllTags: (state) => {
      // 提取路径标签
      const pathTagsSet = new Set<string>()
      for (const bp of state.blueprints) {
        if (bp.directoryPath) {
          pathTagsSet.add(bp.directoryPath)
        }
      }
      
      // 生成路径标签
      const pathTags = Array.from(pathTagsSet).map(dirPath => ({
        id: `path:${dirPath}`,
        name: dirPath,
        color: '#3B82F6', // 蓝色
      }))
      
      // 合并用户标签和路径标签
      return [...state.tags, ...pathTags]
    },

    /**
     * 获取用户标签
     */
    getUserTags: (state) => {
      return state.tags.filter(tag => !tag.id.startsWith('path:'))
    },

    /**
     * 获取路径标签
     */
    getPathTags: (state) => {
      const pathTagsSet = new Set<string>()
      for (const bp of state.blueprints) {
        if (bp.directoryPath) {
          pathTagsSet.add(bp.directoryPath)
        }
      }
      
      return Array.from(pathTagsSet).map(dirPath => ({
        id: `path:${dirPath}`,
        name: dirPath,
        color: '#3B82F6',
      }))
    },
  },

  actions: {
    /**
     * 初始化并订阅全局标签（页面加载时调用）
     */
    async subscribeGlobalTags(): Promise<void> {
      if (!window.quickAccessAPI) {
        console.error('[QuickAccessStore] quickAccessAPI 不可用')
        this.isSubscribed = false
        return
      }

      try {
        // 订阅初始数据
        const config = await window.quickAccessAPI.subscribeGlobalTags()
        this.tags = config.tags || []
        
        // 将 blueprintTags 对象转换为 Map
        this.blueprintTagsMap.clear()
        if (config.blueprintTags) {
          for (const [path, tagIds] of Object.entries(config.blueprintTags)) {
            this.blueprintTagsMap.set(path, tagIds)
          }
        }

        // 监听更新事件
        window.quickAccessAPI.onGlobalTagsUpdated((updatedConfig) => {
          this.tags = updatedConfig.tags || []
          this.blueprintTagsMap.clear()
          if (updatedConfig.blueprintTags) {
            for (const [path, tagIds] of Object.entries(updatedConfig.blueprintTags)) {
              this.blueprintTagsMap.set(path, tagIds)
            }
          }
          this.lastSyncTime = Date.now()
        })

        // 监听蓝图数据推送
        window.quickAccessAPI.onBlueprintsUpdated((blueprints) => {
          console.log('[QuickAccessStore] 收到蓝图数据推送:', blueprints.length)
          this.blueprints = blueprints
        })

        // 加载最近使用的蓝图
        await this.loadRecentBlueprints()

        // 加载蓝图列表
        await this.loadBlueprints()

        this.isSubscribed = true
        this.lastSyncTime = Date.now()
      } catch (error) {
        console.error('[QuickAccessStore] 订阅全局标签失败:', error)
        this.isSubscribed = false
        throw error
      }
    },

    /**
     * 取消订阅（页面卸载时调用）
     */
    unsubscribe(): void {
      if (window.quickAccessAPI) {
        window.quickAccessAPI.unsubscribe()
      }
      this.isSubscribed = false
    },

    /**
     * 切换筛选标签（本地状态，不持久化）
     */
    toggleFilter(tagId: string, logic?: 'and' | 'or' | 'not'): void {
      if (this.activeFilters.has(tagId)) {
        // 如果提供了逻辑类型，切换逻辑；否则移除
        if (logic) {
          const currentLogic = this.activeFilters.get(tagId)
          const nextLogic = currentLogic === 'or' ? 'and' : (currentLogic === 'and' ? 'not' : 'or')
          this.activeFilters.set(tagId, nextLogic)
        } else {
          this.activeFilters.delete(tagId)
        }
      } else {
        // 添加筛选
        this.activeFilters.set(tagId, logic || 'or')
      }
    },

    /**
     * 清除所有筛选
     */
    clearFilters(): void {
      this.activeFilters.clear()
    },

    /**
     * 使用蓝图（转发给主窗口），使用成功后根据配置自动隐藏窗口
     */
    async useBlueprint(blueprintPath: string): Promise<void> {
      if (!window.quickAccessAPI) {
        throw new Error('quickAccessAPI 不可用')
      }

      try {
        await window.quickAccessAPI.useBlueprint(blueprintPath)
        
        // 记录使用历史
        await this.recordRecentUse(blueprintPath)

        // 根据配置判断是否自动隐藏窗口
        if (window.generalSettingsAPI) {
          const settings = await window.generalSettingsAPI.loadGeneralSettings()
          if (settings.quickAccessAutoHideAfterUse !== false) {
            // 默认自动隐藏
            await window.quickAccessAPI.hideQuickAccess()
          }
        } else {
          // 如果没有设置API，默认自动隐藏
          await window.quickAccessAPI.hideQuickAccess()
        }
      } catch (error) {
        console.error('[QuickAccessStore] 使用蓝图失败:', error)
        throw error
      }
    },

    /**
     * 记录蓝图使用（更新最近使用列表）
     */
    async recordRecentUse(blueprintPath: string): Promise<void> {
      if (!window.quickAccessAPI) {
        return
      }

      try {
        await window.quickAccessAPI.recordBlueprintUsage(blueprintPath)
        // 重新加载最近使用列表
        await this.loadRecentBlueprints()
      } catch (error) {
        console.error('[QuickAccessStore] 记录蓝图使用失败:', error)
      }
    },

    /**
     * 加载最近使用的蓝图列表
     */
    async loadRecentBlueprints(): Promise<void> {
      if (!window.quickAccessAPI) {
        return
      }

      try {
        const recent = await window.quickAccessAPI.getRecentBlueprints()
        this.recentBlueprints = recent
      } catch (error) {
        console.error('[QuickAccessStore] 加载最近使用蓝图失败:', error)
      }
    },

    /**
     * 加载蓝图列表（从主窗口获取）
     */
    async loadBlueprints(): Promise<void> {
      if (!window.quickAccessAPI) {
        console.error('[QuickAccessStore] quickAccessAPI 不可用')
        return
      }

      try {
        console.log('[QuickAccessStore] 开始加载蓝图列表...')
        const blueprints = await window.quickAccessAPI.getBlueprints()
        console.log('[QuickAccessStore] 加载到的蓝图数量:', blueprints.length)
        if (blueprints.length > 0) {
          console.log('[QuickAccessStore] 蓝图数据示例:', blueprints.slice(0, 3))
        }
        this.blueprints = blueprints
      } catch (error) {
        console.error('[QuickAccessStore] 加载蓝图列表失败:', error)
      }
    },

    /**
     * 获取筛选后的蓝图列表（computed）
     */
    getFilteredBlueprints(): Array<{
      id: string
      name: string
      path: string
      directoryPath?: string
      tags: string[]
    }> {
      // 将蓝图列表转换为 ActiveBlueprintNodeWithTags 格式
      const blueprintsWithTags: ActiveBlueprintNodeWithTags[] = this.blueprints.map((bp) => ({
        id: bp.id,
        name: bp.name,
        type: 'blueprint',
        path: bp.path,
        directoryPath: bp.directoryPath,
        tags: bp.tags,
      }))

      // 使用筛选函数
      return filterBlueprintsByTags(blueprintsWithTags, this.activeFilters)
    },
  },
})

