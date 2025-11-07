/**
 * 蓝图信息 IPC 处理器
 */
import { ipcMain, BrowserWindow } from 'electron'
import { blueprintInfoService } from '../Service/BlueprintInfo/BlueprintInfoService'
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
 * 注册蓝图信息 IPC 处理器
 */
export function registerBlueprintInfoHandlers(): void {
  // 批量解析蓝图
  ipcMain.handle(
    IPC_CHANNEL_PARSE,
    async (
      event,
      blueprints: BlueprintPathInfo[]
    ): Promise<ParseResult> => {
      try {
        // 获取发送事件的窗口
        const window = BrowserWindow.fromWebContents(event.sender)
        if (!window) {
          throw new Error('无法获取窗口对象')
        }

        // 进度回调：通过 IPC 发送到渲染进程
        const progressCallback = (progress: ParseProgressInfo): void => {
          event.sender.send(IPC_CHANNEL_PROGRESS, progress)
        }

        // 执行解析
        const result = await blueprintInfoService.parseBlueprints(
          blueprints,
          progressCallback
        )

        return result
      } catch (error) {
        console.error('Failed to parse blueprints:', error)
        throw error
      }
    }
  )

  // 获取已解析的蓝图信息
  ipcMain.handle(
    IPC_CHANNEL_GET,
    async (_event, blueprintId: string): Promise<BlueprintInfo | null> => {
      try {
        return await blueprintInfoService.getBlueprintInfo(blueprintId)
      } catch (error) {
        console.error(`Failed to get blueprint info ${blueprintId}:`, error)
        throw error
      }
    }
  )

  // 列出所有已解析的蓝图 ID
  ipcMain.handle(IPC_CHANNEL_LIST, async (): Promise<string[]> => {
    try {
      return await blueprintInfoService.listParsedBlueprints()
    } catch (error) {
      console.error('Failed to list parsed blueprints:', error)
      throw error
    }
  })
}

