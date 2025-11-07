/**
 * 全局标签 API 预加载脚本
 */
import { contextBridge, ipcRenderer } from 'electron'

const IPC_CHANNEL_LOAD_GLOBAL_TAGS = 'global-tags:load'
const IPC_CHANNEL_SAVE_GLOBAL_TAGS = 'global-tags:save'

/**
 * 全局标签配置数据结构
 */
export interface GlobalTagsConfig {
  version: string
  tags: Array<{
    id: string
    name: string
    color: string
  }>
  blueprintTags: Record<string, string[]> // key: blueprintPath, value: tagId[]
}

/**
 * Electron 全局标签 API
 */
export interface ElectronGlobalTagsAPI {
  /**
   * 加载全局标签配置
   */
  loadGlobalTags(): Promise<GlobalTagsConfig>

  /**
   * 保存全局标签配置
   */
  saveGlobalTags(data: GlobalTagsConfig): Promise<void>
}

/**
 * 暴露全局标签 API 到渲染进程
 */
export function exposeGlobalTagsAPI(): void {
  contextBridge.exposeInMainWorld('globalTagsAPI', {
    loadGlobalTags: (): Promise<GlobalTagsConfig> => {
      return ipcRenderer.invoke(IPC_CHANNEL_LOAD_GLOBAL_TAGS)
    },

    saveGlobalTags: (data: GlobalTagsConfig): Promise<void> => {
      return ipcRenderer.invoke(IPC_CHANNEL_SAVE_GLOBAL_TAGS, data)
    },
  } as ElectronGlobalTagsAPI)
}

