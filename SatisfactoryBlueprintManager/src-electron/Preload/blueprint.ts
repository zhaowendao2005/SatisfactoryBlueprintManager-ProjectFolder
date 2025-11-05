/**
 * 暴露蓝图相关 API
 */
import { contextBridge, ipcRenderer } from 'electron'
import type {
  SelectDirectoryResult,
  ScanDirectoryParams,
  ScanDirectoryResult,
  SourceConfigFile,
  BlueprintNode,
} from '../../public/types/blueprint'

/**
 * 暴露蓝图 API
 */
export const exposeBlueprintAPI = (): void => {
  contextBridge.exposeInMainWorld('blueprintAPI', {
    /**
     * 打开文件夹选择对话框
     */
    selectDirectory: (): Promise<SelectDirectoryResult> =>
      ipcRenderer.invoke('blueprint:selectDirectory'),

    /**
     * 扫描目录（递归）
     */
    scanDirectory: (params: ScanDirectoryParams): Promise<ScanDirectoryResult> =>
      ipcRenderer.invoke('blueprint:scanDirectory', params),

    /**
     * 读取单层目录（非递归，用于懒加载）
     */
    readDirectoryShallow: (dirPath: string): Promise<BlueprintNode[]> =>
      ipcRenderer.invoke('blueprint:readDirectoryShallow', dirPath),

    /**
     * 写入配置文件
     */
    writeSourceConfig: (sourcePath: string, config: SourceConfigFile): Promise<void> =>
      ipcRenderer.invoke('blueprint:writeSourceConfig', sourcePath, config),

    /**
     * 读取配置文件
     */
    readSourceConfig: (sourcePath: string): Promise<SourceConfigFile | null> =>
      ipcRenderer.invoke('blueprint:readSourceConfig', sourcePath),
  })
}

