/**
 * 蓝图信息服务（主进程）
 * 协调解析任务的执行
 */
import { EventEmitter } from 'events'
import type { BlueprintPathInfo, BlueprintInfo, ParseResult, ParseProgressInfo } from '../../../public/types/blueprint-info'
import { blueprintParser, FileNotFoundError, ParseError, TimeoutError } from './BlueprintParser'
import { blueprintInfoFileService } from './file-service'

/**
 * 蓝图信息服务类
 * @注意事项 单例模式，全局仅一个实例
 */
export class BlueprintInfoService extends EventEmitter {
  private isRunning = false

  /**
   * 批量解析蓝图
   * @param blueprints 蓝图路径信息
   * @param progressCallback 进度回调（每完成一个任务触发）
   * @returns 解析结果
   */
  async parseBlueprints(
    blueprints: BlueprintPathInfo[],
    progressCallback: (progress: ParseProgressInfo) => void
  ): Promise<ParseResult> {
    if (this.isRunning) {
      throw new Error('解析任务正在进行中，请稍后')
    }

    this.isRunning = true
    const startTime = Date.now()
    const result: ParseResult = {
      succeeded: [],
      failed: [],
      totalTime: 0,
    }

    const total = blueprints.length
    let completed = 0
    let succeeded = 0
    let failed = 0

    try {
      // 串行解析每个蓝图
      for (const blueprint of blueprints) {
        const { id, name, path: filePath } = blueprint

        // 更新进度：当前正在解析的蓝图
        progressCallback({
          total,
          completed,
          succeeded,
          failed,
          currentBlueprintName: name,
          percentage: Math.round((completed / total) * 100),
          estimatedTimeLeft: this.calculateEstimatedTime(completed, total, startTime),
        })

        try {
          // 推断文件路径
          const { sbpPath, sbpcfgPath } = blueprintParser.inferBlueprintPaths(filePath)

          // 解析蓝图
          const info = await blueprintParser.parse(sbpPath, sbpcfgPath, id)

          // 保存结果
          await blueprintInfoFileService.save(info)

          result.succeeded.push(id)
          succeeded++
        } catch (error) {
          let errorMessage = 'Unknown error'
          if (error instanceof FileNotFoundError) {
            errorMessage = '文件未找到'
          } else if (error instanceof ParseError) {
            errorMessage = `解析失败: ${error.message}`
          } else if (error instanceof TimeoutError) {
            errorMessage = '解析超时（超过 10 秒）'
          } else if (error instanceof Error) {
            errorMessage = error.message
          }

          result.failed.push({
            blueprintId: id,
            blueprintName: name,
            error: errorMessage,
          })
          failed++

          // 记录错误日志
          console.error(`Failed to parse blueprint ${id} (${name}):`, error)
        }

        completed++

        // 更新进度：完成一个任务
        progressCallback({
          total,
          completed,
          succeeded,
          failed,
          currentBlueprintName: completed < total ? blueprints[completed]?.name || '' : '',
          percentage: Math.round((completed / total) * 100),
          estimatedTimeLeft: this.calculateEstimatedTime(completed, total, startTime),
        })
      }

      // 更新索引文件
      const allParsedIds = await blueprintInfoFileService.readIndex()
      const newIds = result.succeeded.filter((id) => !allParsedIds.includes(id))
      if (newIds.length > 0) {
        await blueprintInfoFileService.updateIndex([...allParsedIds, ...newIds])
      }

      result.totalTime = Date.now() - startTime
      return result
    } finally {
      this.isRunning = false
    }
  }

  /**
   * 获取已解析的蓝图信息（从本地文件读取）
   */
  async getBlueprintInfo(blueprintId: string): Promise<BlueprintInfo | null> {
    return await blueprintInfoFileService.read(blueprintId)
  }

  /**
   * 列出所有已解析的蓝图 ID（从索引文件读取）
   */
  async listParsedBlueprints(): Promise<string[]> {
    return await blueprintInfoFileService.readIndex()
  }

  /**
   * 计算预计剩余时间
   */
  private calculateEstimatedTime(
    completed: number,
    total: number,
    startTime: number
  ): number {
    if (completed === 0) {
      return 0
    }

    const elapsed = (Date.now() - startTime) / 1000 // 秒
    const avgTimePerTask = elapsed / completed
    const remaining = total - completed
    return Math.round(remaining * avgTimePerTask)
  }
}

export const blueprintInfoService = new BlueprintInfoService()

