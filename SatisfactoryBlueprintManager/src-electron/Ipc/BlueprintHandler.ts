/**
 * 蓝图相关 IPC 处理器
 */
import { ipcMain, dialog } from 'electron'
import { promises as fs } from 'fs'
import type {
  SelectDirectoryResult,
  ScanDirectoryParams,
  ScanDirectoryResult,
  SourceConfigFile,
} from '../../public/types/blueprint'
import { fileScannerService, FileLimitExceededError, TimeoutError, PermissionError } from '../Service/Blueprint/file-scanner'
import { configManagerService } from '../Service/Blueprint/config-manager'
import type { BlueprintNode } from '../../public/types/blueprint'

/**
 * 蓝图 IPC 处理器
 */
export class BlueprintHandler {
  /**
   * 注册蓝图相关 IPC 处理器
   */
  static register(): void {
    // 选择目录
    ipcMain.handle('blueprint:selectDirectory', async (): Promise<SelectDirectoryResult> => {
      try {
        const result = await dialog.showOpenDialog({
          properties: ['openDirectory'],
          title: '选择蓝图源目录',
        })

        if (result.canceled || result.filePaths.length === 0) {
          return { canceled: true }
        }

        const selectedPath = result.filePaths[0]

        // 验证路径有效性
        try {
          await fs.access(selectedPath)
          return { canceled: false, path: selectedPath }
        } catch (error) {
          throw new Error(`无法访问目录：${selectedPath} - ${error instanceof Error ? error.message : String(error)}`)
        }
      } catch (error) {
        throw new Error(`选择目录失败：${error instanceof Error ? error.message : String(error)}`)
      }
    })

    // 扫描目录（递归）
    ipcMain.handle('blueprint:scanDirectory', async (_event, params: ScanDirectoryParams): Promise<ScanDirectoryResult> => {
      try {
        return await fileScannerService.scanDirectory(params)
      } catch (error) {
        if (error instanceof FileLimitExceededError) {
          throw error
        }
        if (error instanceof TimeoutError) {
          throw error
        }
        if (error instanceof PermissionError) {
          throw error
        }
        throw new Error(`扫描目录失败：${error instanceof Error ? error.message : String(error)}`)
      }
    })

    // 读取单层目录（懒加载）
    ipcMain.handle('blueprint:readDirectoryShallow', async (_event, dirPath: string): Promise<BlueprintNode[]> => {
      try {
        return await fileScannerService.readDirectoryShallow(dirPath)
      } catch (error) {
        if (error instanceof PermissionError) {
          throw error
        }
        throw new Error(`读取目录失败：${dirPath} - ${error instanceof Error ? error.message : String(error)}`)
      }
    })

    // 写入配置文件
    ipcMain.handle('blueprint:writeSourceConfig', async (_event, sourcePath: string, config: SourceConfigFile): Promise<void> => {
      try {
        await configManagerService.writeSourceConfig(sourcePath, config)
      } catch (error) {
        throw new Error(`写入配置文件失败：${error instanceof Error ? error.message : String(error)}`)
      }
    })

    // 读取配置文件
    ipcMain.handle('blueprint:readSourceConfig', async (_event, sourcePath: string): Promise<SourceConfigFile | null> => {
      try {
        return await configManagerService.readSourceConfig(sourcePath)
      } catch (error) {
        throw new Error(`读取配置文件失败：${error instanceof Error ? error.message : String(error)}`)
      }
    })
  }
}

