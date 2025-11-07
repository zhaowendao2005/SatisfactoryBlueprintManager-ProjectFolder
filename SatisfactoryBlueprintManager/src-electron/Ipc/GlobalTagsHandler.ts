/**
 * 全局标签 IPC 处理器
 */
import { ipcMain } from 'electron'
import { globalTagsFileService } from '../Service/GlobalTags/file-service'
import type { GlobalTagsConfig } from '../Service/GlobalTags/file-service'

const IPC_CHANNEL_LOAD_GLOBAL_TAGS = 'global-tags:load'
const IPC_CHANNEL_SAVE_GLOBAL_TAGS = 'global-tags:save'

/**
 * 注册全局标签 IPC 处理器
 */
export function registerGlobalTagsHandlers(): void {
  // 加载全局标签
  ipcMain.handle(IPC_CHANNEL_LOAD_GLOBAL_TAGS, async (): Promise<GlobalTagsConfig> => {
    try {
      return await globalTagsFileService.loadGlobalTags()
    } catch (error) {
      console.error('Failed to load global tags:', error)
      throw error
    }
  })

  // 保存全局标签
  ipcMain.handle(IPC_CHANNEL_SAVE_GLOBAL_TAGS, async (_event, data: GlobalTagsConfig): Promise<void> => {
    try {
      await globalTagsFileService.saveGlobalTags(data)
    } catch (error) {
      console.error('Failed to save global tags:', error)
      throw error
    }
  })
}

