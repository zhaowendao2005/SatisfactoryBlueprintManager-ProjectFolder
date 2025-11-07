/**
 * 蓝图信息 API 预加载脚本
 */
import { contextBridge, ipcRenderer } from 'electron'
import type {
  BlueprintPathInfo,
  BlueprintInfo,
  ParseResult,
  ParseProgressInfo,
} from '../../public/types/blueprint-info'

const IPC_CHANNEL_PARSE = 'blueprint-info:parse'
const IPC_CHANNEL_PROGRESS = 'blueprint-info:progress'
const IPC_CHANNEL_GET = 'blueprint-info:get'
const IPC_CHANNEL_LIST = 'blueprint-info:list'

/**
 * Electron 蓝图信息 API
 */
export interface ElectronBlueprintInfoAPI {
  /**
   * 批量解析蓝图配置文件
   * @param blueprints 蓝图路径信息列表
   * @returns 解析结果（成功和失败的 blueprintId）
   * @throws 如果主进程服务不可用
   */
  parseBlueprints(blueprints: BlueprintPathInfo[]): Promise<ParseResult>

  /**
   * 订阅解析进度事件
   * @param callback 进度回调函数
   * @returns 取消订阅的函数
   */
  onProgress(callback: (progress: ParseProgressInfo) => void): () => void

  /**
   * 获取已解析的蓝图信息
   * @param blueprintId 蓝图 ID
   * @returns 蓝图信息，如果未解析则返回 null
   */
  getBlueprintInfo(blueprintId: string): Promise<BlueprintInfo | null>

  /**
   * 列出所有已解析的蓝图 ID
   * @returns blueprintId 列表
   */
  listParsedBlueprints(): Promise<string[]>
}

/**
 * 暴露蓝图信息 API 到渲染进程
 */
export function exposeBlueprintInfoAPI(): void {
  contextBridge.exposeInMainWorld('blueprintInfoAPI', {
    parseBlueprints: (
      blueprints: BlueprintPathInfo[]
    ): Promise<ParseResult> => {
      return ipcRenderer.invoke(IPC_CHANNEL_PARSE, blueprints)
    },

    onProgress: (
      callback: (progress: ParseProgressInfo) => void
    ): (() => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        progress: ParseProgressInfo
      ): void => {
        callback(progress)
      }

      ipcRenderer.on(IPC_CHANNEL_PROGRESS, handler)

      // 返回取消订阅的函数
      return () => {
        ipcRenderer.removeListener(IPC_CHANNEL_PROGRESS, handler)
      }
    },

    getBlueprintInfo: (blueprintId: string): Promise<BlueprintInfo | null> => {
      return ipcRenderer.invoke(IPC_CHANNEL_GET, blueprintId)
    },

    listParsedBlueprints: (): Promise<string[]> => {
      return ipcRenderer.invoke(IPC_CHANNEL_LIST)
    },
  } as ElectronBlueprintInfoAPI)
}

