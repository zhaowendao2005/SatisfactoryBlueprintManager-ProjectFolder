/**
 * 同步数据源
 * 职责：封装 IPC 调用
 */
import type {
  SyncLibraryToGameParams,
  SyncGameToLibraryParams,
  SyncResult,
  BlueprintIndex,
  FileLockStatus,
  BlueprintSource,
} from 'src/../../public/types/sync'

/**
 * 同步数据源
 */
export class SyncDatasource {
  /**
   * 获取 syncAPI
   */
  private getSyncAPI() {
    if (!window.syncAPI) {
      throw new Error('syncAPI is not available')
    }
    return window.syncAPI
  }

  /**
   * 获取默认路径
   */
  async getDefaultPaths(): Promise<{
    saveGamePath: string
    libraryPath: string
    backupPath: string
  }> {
    try {
      return await this.getSyncAPI().getDefaultPaths()
    } catch (error) {
      console.error('Failed to get default paths:', error)
      throw new Error(`获取默认路径失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 扫描存档目录下的所有一级目录
   */
  async scanSaveGames(basePath: string): Promise<string[]> {
    try {
      return await this.getSyncAPI().scanSaveGames(basePath)
    } catch (error) {
      console.error('Failed to scan save games:', error)
      throw new Error(`扫描存档目录失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 构建蓝图索引
   */
  async buildIndex(sources: BlueprintSource[]): Promise<BlueprintIndex> {
    try {
      // 序列化 sources，移除 Vue 响应式代理
      const serializableSources = sources.map((source) => ({
        id: source.id,
        name: source.name,
        path: source.path,
        enabled: source.enabled,
      }))
      return await this.getSyncAPI().buildIndex(serializableSources)
    } catch (error) {
      console.error('Failed to build index:', error)
      throw new Error(`构建索引失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 库→游戏同步
   */
  async syncLibraryToGame(params: SyncLibraryToGameParams): Promise<SyncResult> {
    try {
      // 深拷贝参数，确保完全可序列化
      const serializableParams = JSON.parse(
        JSON.stringify({
          targetPath: params.targetPath,
          blueprints: params.blueprints,
          backupPath: params.backupPath,
        })
      )
      return await this.getSyncAPI().syncLibraryToGame(serializableParams)
    } catch (error) {
      console.error('Failed to sync library to game:', error)
      throw new Error(`同步失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 游戏→库同步
   */
  async syncGameToLibrary(params: SyncGameToLibraryParams): Promise<SyncResult> {
    try {
      // 深拷贝参数，确保完全可序列化
      const serializableParams = JSON.parse(
        JSON.stringify({
          sourcePath: params.sourcePath,
          mode: params.mode,
          index: params.index,
          fallbackPath: params.fallbackPath,
        })
      )
      return await this.getSyncAPI().syncGameToLibrary(serializableParams)
    } catch (error) {
      console.error('Failed to sync game to library:', error)
      throw new Error(`同步失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 检查文件占用
   */
  async checkFileLock(filePath: string): Promise<FileLockStatus> {
    try {
      return await this.getSyncAPI().checkFileLock(filePath)
    } catch (error) {
      console.error('Failed to check file lock:', error)
      return { isLocked: false }
    }
  }

  /**
   * 创建备份
   */
  async createBackup(sourcePath: string, backupPath: string): Promise<string> {
    try {
      return await this.getSyncAPI().createBackup(sourcePath, backupPath)
    } catch (error) {
      console.error('Failed to create backup:', error)
      throw new Error(`创建备份失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 打开文件夹
   */
  async openFolder(folderPath: string): Promise<void> {
    try {
      await this.getSyncAPI().openFolder(folderPath)
    } catch (error) {
      console.error('Failed to open folder:', error)
      throw new Error(`打开文件夹失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

// 导出单例
export const syncDatasource = new SyncDatasource()

