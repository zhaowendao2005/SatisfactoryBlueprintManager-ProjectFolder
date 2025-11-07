import { defineStore } from 'pinia'
import type { TagDefinition } from '../../types'
import type { GlobalTagsState, GlobalTagsConfig } from './types'
import { globalTagsDatasource } from './datasource'

/**
 * 全局标签 Store
 * @注意事项 标签定义和蓝图-标签关系全局统一，不随配置切换
 */
export const useGlobalTagsStore = defineStore('globalTags', {
  state: (): GlobalTagsState => ({
    tags: [],
    blueprintTagsMap: new Map<string, string[]>(),
  }),

  actions: {
    /**
     * 初始化全局标签（应用启动时调用）
     */
    async initializeGlobalTags(): Promise<void> {
      try {
        const config = await globalTagsDatasource.loadGlobalTags()
        this.tags = config.tags || []
        
        // 将 blueprintTags 对象转换为 Map
        this.blueprintTagsMap.clear()
        if (config.blueprintTags) {
          for (const [path, tagIds] of Object.entries(config.blueprintTags)) {
            this.blueprintTagsMap.set(path, tagIds)
          }
        }
      } catch (error) {
        console.error('Failed to initialize global tags:', error)
        // 失败时保持空状态
        this.tags = []
        this.blueprintTagsMap.clear()
      }
    },

    /**
     * 保存全局标签到文件
     */
    async saveGlobalTags(): Promise<void> {
      try {
        // 将 Map 转换为对象
        const blueprintTags: Record<string, string[]> = {}
        for (const [path, tagIds] of this.blueprintTagsMap.entries()) {
          blueprintTags[path] = tagIds
        }

        const config: GlobalTagsConfig = {
          version: '1.0.0',
          tags: this.tags,
          blueprintTags,
        }

        await globalTagsDatasource.saveGlobalTags(config)
      } catch (error) {
        console.error('Failed to save global tags:', error)
        throw error
      }
    },

    /**
     * 创建标签
     * @param name 标签名称
     * @param color 标签颜色
     */
    async createTag(name: string, color: string): Promise<void> {
      if (!name || name.trim() === '') {
        throw new Error('标签名称不能为空')
      }

      // 检查标签是否已存在
      const existingTag = this.tags.find((t) => t.name === name.trim())
      if (existingTag) {
        throw new Error('标签名称已存在')
      }

      // 生成标签 ID
      const tagId = `tag-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

      // 添加标签
      this.tags.push({
        id: tagId,
        name: name.trim(),
        color: color || '#3B82F6',
      })

      // 保存
      await this.saveGlobalTags()
    },

    /**
     * 删除标签
     * @param tagId 标签 ID
     */
    async deleteTag(tagId: string): Promise<void> {
      // 查找标签索引
      const tagIndex = this.tags.findIndex((t) => t.id === tagId)
      if (tagIndex === -1) {
        throw new Error('标签不存在')
      }

      // 从所有蓝图中移除该标签
      for (const [path, tagIds] of this.blueprintTagsMap.entries()) {
        const index = tagIds.indexOf(tagId)
        if (index !== -1) {
          tagIds.splice(index, 1)
        }
      }

      // 删除标签
      this.tags.splice(tagIndex, 1)

      // 保存
      await this.saveGlobalTags()
    },

    /**
     * 更新标签（重命名或修改颜色）
     * @param tagId 标签 ID
     * @param updates 更新内容
     */
    async updateTag(tagId: string, updates: { name?: string; color?: string }): Promise<void> {
      const tag = this.tags.find((t) => t.id === tagId)
      if (!tag) {
        throw new Error('标签不存在')
      }

      if (updates.name !== undefined) {
        const trimmedName = updates.name.trim()
        if (!trimmedName) {
          throw new Error('标签名称不能为空')
        }
        
        // 检查名称是否与其他标签冲突
        const existingTag = this.tags.find((t) => t.id !== tagId && t.name === trimmedName)
        if (existingTag) {
          throw new Error('标签名称已存在')
        }
        
        tag.name = trimmedName
      }

      if (updates.color !== undefined) {
        tag.color = updates.color
      }

      // 保存
      await this.saveGlobalTags()
    },

    /**
     * 批量添加标签到蓝图
     * @param blueprintPaths 蓝图路径数组
     * @param tagId 标签 ID
     */
    async batchAddTags(blueprintPaths: string[], tagId: string): Promise<void> {
      if (blueprintPaths.length === 0) {
        throw new Error('没有选中任何蓝图')
      }

      // 检查标签是否存在
      const tagExists = this.tags.some((t) => t.id === tagId)
      if (!tagExists) {
        throw new Error('标签不存在')
      }

      for (const path of blueprintPaths) {
        const tags = this.blueprintTagsMap.get(path) || []
        if (!tags.includes(tagId)) {
          tags.push(tagId)
          this.blueprintTagsMap.set(path, tags)
        }
      }

      // 保存
      await this.saveGlobalTags()
    },

    /**
     * 批量移除蓝图的标签
     * @param blueprintPaths 蓝图路径数组
     * @param tagId 标签 ID
     */
    async batchRemoveTags(blueprintPaths: string[], tagId: string): Promise<void> {
      if (blueprintPaths.length === 0) {
        throw new Error('没有选中任何蓝图')
      }

      for (const path of blueprintPaths) {
        const tags = this.blueprintTagsMap.get(path)
        if (tags) {
          const index = tags.indexOf(tagId)
          if (index !== -1) {
            tags.splice(index, 1)
            // 如果标签数组为空，可以删除该条目（可选）
            if (tags.length === 0) {
              this.blueprintTagsMap.delete(path)
            }
          }
        }
      }

      // 保存
      await this.saveGlobalTags()
    },

    /**
     * 获取蓝图的标签ID列表
     * @param blueprintPath 蓝图路径
     */
    getBlueprintTags(blueprintPath: string): string[] {
      return this.blueprintTagsMap.get(blueprintPath) || []
    },

    /**
     * 获取所有标签定义
     */
    getAllTags(): TagDefinition[] {
      return [...this.tags]
    },
  },
})

