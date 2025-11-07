import type { GlobalTagsConfig } from './types'

/**
 * 全局标签数据源接口
 */
export interface IGlobalTagsDatasource {
  /**
   * 加载全局标签配置
   */
  loadGlobalTags(): Promise<GlobalTagsConfig>

  /**
   * 保存全局标签配置
   */
  saveGlobalTags(config: GlobalTagsConfig): Promise<void>
}

/**
 * 全局标签数据源实现
 */
class GlobalTagsDatasource implements IGlobalTagsDatasource {
  private getGlobalTagsAPI() {
    const api = window.globalTagsAPI
    if (!api) {
      throw new Error('全局标签 API 不可用，请确保在 Electron 环境中运行')
    }
    return api
  }

  async loadGlobalTags(): Promise<GlobalTagsConfig> {
    try {
      const config = await this.getGlobalTagsAPI().loadGlobalTags()
      if (!config) {
        // 返回默认配置
        return {
          version: '1.0.0',
          tags: [],
          blueprintTags: {},
        }
      }
      // 深拷贝，确保返回的是可序列化的纯对象
      return JSON.parse(JSON.stringify(config)) as GlobalTagsConfig
    } catch (error) {
      console.error('Failed to load global tags:', error)
      // 文件不存在时返回空配置
      return {
        version: '1.0.0',
        tags: [],
        blueprintTags: {},
      }
    }
  }

  async saveGlobalTags(config: GlobalTagsConfig): Promise<void> {
    try {
      // 深拷贝数据，确保是可序列化的纯对象（移除 Vue 响应式代理）
      const serializableData: GlobalTagsConfig = JSON.parse(JSON.stringify(config))
      await this.getGlobalTagsAPI().saveGlobalTags(serializableData)
    } catch (error) {
      console.error('Failed to save global tags:', error)
      throw error
    }
  }
}

export const globalTagsDatasource = new GlobalTagsDatasource()

