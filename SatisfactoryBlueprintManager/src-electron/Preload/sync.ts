/**
 * 暴露同步相关 API
 */
import { contextBridge, ipcRenderer } from 'electron'
import type {
  SyncLibraryToGameParams,
  SyncGameToLibraryParams,
  SyncResult,
  BlueprintIndex,
  FileLockStatus,
  NewBlueprintsResult,
  SyncConfigFile,
} from '../../public/types/sync'
import type { BlueprintSource } from '../../public/types/blueprint'

/**
 * 暴露同步 API
 */
export const exposeSyncAPI = (): void => {
  contextBridge.exposeInMainWorld('syncAPI', {
    /**
     * 获取默认路径
     */
    getDefaultPaths: () => ipcRenderer.invoke('sync:getDefaultPaths'),

    /**
     * 扫描存档目录下的所有一级目录
     */
    scanSaveGames: (basePath: string): Promise<string[]> =>
      ipcRenderer.invoke('sync:scanSaveGames', basePath),

    /**
     * 构建蓝图索引
     */
    buildIndex: (sources: BlueprintSource[]): Promise<BlueprintIndex> =>
      ipcRenderer.invoke('sync:buildIndex', sources),

    /**
     * 库→游戏同步
     */
    syncLibraryToGame: (params: SyncLibraryToGameParams): Promise<SyncResult> =>
      ipcRenderer.invoke('sync:libraryToGame', params),

    /**
     * 检测新增蓝图
     */
    detectNewBlueprints: (gamePath: string, index: BlueprintIndex): Promise<NewBlueprintsResult> =>
      ipcRenderer.invoke('sync:detectNewBlueprints', gamePath, index),

    /**
     * 游戏→库同步（简化版：只处理新增蓝图）
     */
    syncGameToLibrary: (params: SyncGameToLibraryParams): Promise<SyncResult> =>
      ipcRenderer.invoke('sync:gameToLibrary', params),

    /**
     * 读取同步配置
     */
    readSyncConfig: (gamePath: string): Promise<SyncConfigFile | null> =>
      ipcRenderer.invoke('sync:readSyncConfig', gamePath),

    /**
     * 检查文件占用
     */
    checkFileLock: (filePath: string): Promise<FileLockStatus> =>
      ipcRenderer.invoke('sync:checkFileLock', filePath),

    /**
     * 创建备份
     */
    createBackup: (sourcePath: string, backupPath: string): Promise<string> =>
      ipcRenderer.invoke('sync:createBackup', sourcePath, backupPath),

    /**
     * 打开文件夹
     */
    openFolder: (path: string): Promise<void> => ipcRenderer.invoke('sync:openFolder', path),
  })
}

