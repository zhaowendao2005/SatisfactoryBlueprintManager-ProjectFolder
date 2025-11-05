/**
 * 同步相关 IPC 处理器
 * 职责：处理同步相关的 IPC 请求
 */
import { ipcMain, shell } from 'electron'
import type {
  SyncLibraryToGameParams,
  SyncGameToLibraryParams,
  SyncResult,
  BlueprintIndex,
  FileLockStatus,
  BlueprintSource,
  NewBlueprintsResult,
} from '../../public/types/sync'
import { SyncService } from '../Service/Sync/sync-service'
import { BlueprintIndexer } from '../Service/Sync/blueprint-indexer'
import { PathResolver } from '../Service/Sync/path-resolver'
import { app } from 'electron'
import path from 'path'

/**
 * 注册同步相关 IPC 处理器
 */
export function registerSyncHandlers(): void {
  /**
   * 获取默认路径
   */
  ipcMain.handle('sync:getDefaultPaths', (): {
    saveGamePath: string
    libraryPath: string
    backupPath: string
  } => {
    return {
      saveGamePath: PathResolver.getDefaultSaveGamePath(),
      libraryPath: PathResolver.getDefaultLibraryPath(),
      backupPath: PathResolver.getDefaultBackupPath(),
    }
  })

  /**
   * 扫描存档目录下的所有一级目录
   */
  ipcMain.handle('sync:scanSaveGames', async (_event, basePath: string): Promise<string[]> => {
    try {
      const normalizedPath = PathResolver.normalizePath(basePath)
      const entries = await import('fs/promises').then((fs) =>
        fs.readdir(normalizedPath, { withFileTypes: true })
      )

      const saveGames: string[] = []
      for (const entry of entries) {
        if (entry.isDirectory()) {
          saveGames.push(entry.name)
        }
      }

      return saveGames.sort()
    } catch (error) {
      console.error('Failed to scan save games:', error)
      return []
    }
  })

  /**
   * 构建蓝图索引
   */
  ipcMain.handle(
    'sync:buildIndex',
    async (_event, sources: BlueprintSource[]): Promise<BlueprintIndex> => {
      try {
        // sources 已经在 datasource 层序列化，直接使用
        const index = await BlueprintIndexer.buildIndex(sources)

        // 保存索引到文件
        const userData = app.getPath('userData')
        const indexPath = path.join(userData, 'Data', 'blueprint-index.json')
        await BlueprintIndexer.saveIndex(index, indexPath)

        return index
      } catch (error) {
        console.error('Failed to build index:', error)
        throw error
      }
    }
  )

  /**
   * 库→游戏同步
   */
  ipcMain.handle(
    'sync:libraryToGame',
    async (_event, params: SyncLibraryToGameParams): Promise<SyncResult> => {
      try {
        // 参数已经在 datasource 层序列化，直接使用
        return await SyncService.syncLibraryToGame(params)
      } catch (error) {
        console.error('Failed to sync library to game:', error)
        throw error
      }
    }
  )

  /**
   * 检测新增蓝图
   */
  ipcMain.handle(
    'sync:detectNewBlueprints',
    async (_event, gamePath: string, index: BlueprintIndex): Promise<NewBlueprintsResult> => {
      try {
        return await SyncService.detectNewBlueprints(gamePath, index)
      } catch (error) {
        console.error('Failed to detect new blueprints:', error)
        throw error
      }
    }
  )

  /**
   * 游戏→库同步（简化版：只处理新增蓝图）
   */
  ipcMain.handle(
    'sync:gameToLibrary',
    async (_event, params: SyncGameToLibraryParams): Promise<SyncResult> => {
      try {
        // 参数已经在 datasource 层序列化，直接使用
        return await SyncService.syncGameToLibrary(params)
      } catch (error) {
        console.error('Failed to sync game to library:', error)
        throw error
      }
    }
  )

  /**
   * 检查文件占用
   */
  ipcMain.handle(
    'sync:checkFileLock',
    async (_event, filePath: string): Promise<FileLockStatus> => {
      try {
        return await SyncService.checkFileLock(filePath)
      } catch (error) {
        console.error('Failed to check file lock:', error)
        return { isLocked: false }
      }
    }
  )

  /**
   * 创建备份
   */
  ipcMain.handle(
    'sync:createBackup',
    async (_event, sourcePath: string, backupPath: string): Promise<string> => {
      try {
        const { FileOperationService } = await import('../Service/Sync/file-operation-service')
        return await FileOperationService.createTimestampedBackup(sourcePath, backupPath)
      } catch (error) {
        console.error('Failed to create backup:', error)
        throw error
      }
    }
  )

  /**
   * 打开文件夹
   */
  ipcMain.handle('sync:openFolder', async (_event, folderPath: string): Promise<void> => {
    try {
      // 用户输入的路径直接使用，只需要规范化（Windows 需要反斜杠转正斜杠）
      const normalizedPath = PathResolver.normalizePath(folderPath)
      
      // 检查目录是否存在，不存在则创建
      const fs = await import('fs/promises')
      try {
        await fs.access(normalizedPath)
      } catch {
        // 目录不存在，创建它
        await fs.mkdir(normalizedPath, { recursive: true })
      }
      
      await shell.openPath(normalizedPath)
    } catch (error) {
      console.error('Failed to open folder:', error)
      throw error
    }
  })
}

