/**
 * 蓝图解析器
 * 封装 satisfactory-file-parser 库
 */
import { promises as fs } from 'fs'
import { Parser } from '@etothepii/satisfactory-file-parser'
import type { BlueprintInfo } from '../../../public/types/blueprint-info'

/**
 * 文件未找到错误
 */
export class FileNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FileNotFoundError'
  }
}

/**
 * 解析错误
 */
export class ParseError extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message)
    this.name = 'ParseError'
  }
}

/**
 * 超时错误
 */
export class TimeoutError extends Error {
  constructor() {
    super('Blueprint parsing timeout')
    this.name = 'TimeoutError'
  }
}

/**
 * 蓝图解析器类
 */
export class BlueprintParser {
  private readonly timeoutMs = 10000 // 10 秒超时

  /**
   * 解析单个蓝图文件
   * @param sbpPath .sbp 文件路径
   * @param sbpcfgPath .sbpcfg 文件路径
   * @param blueprintId 蓝图 ID（用于错误日志）
   * @returns 解析后的蓝图信息
   * @throws FileNotFoundError | ParseError | TimeoutError
   */
  async parse(
    sbpPath: string,
    sbpcfgPath: string,
    blueprintId: string
  ): Promise<BlueprintInfo> {
    // 检查文件是否存在
    try {
      await fs.access(sbpPath)
      await fs.access(sbpcfgPath)
    } catch (error) {
      throw new FileNotFoundError(
        `Blueprint files not found: ${sbpPath} or ${sbpcfgPath}`
      )
    }

    // 读取文件并获取文件大小
    const [sbpBuffer, sbpcfgBuffer, sbpStats, sbpcfgStats] = await Promise.all([
      fs.readFile(sbpPath),
      fs.readFile(sbpcfgPath),
      fs.stat(sbpPath),
      fs.stat(sbpcfgPath),
    ])

    // 使用超时包装解析过程
    const parsePromise = this.parseInternal(
      sbpBuffer.buffer,
      sbpcfgBuffer.buffer,
      blueprintId
    )

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new TimeoutError()), this.timeoutMs)
    })

    let blueprint: unknown
    try {
      blueprint = await Promise.race([parsePromise, timeoutPromise])
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw error
      }
      throw new ParseError(
        `Failed to parse blueprint ${blueprintId}: ${error instanceof Error ? error.message : String(error)}`,
        error
      )
    }

    // 提取元数据
    return this.extractMetadata(
      blueprint,
      blueprintId,
      sbpStats.size,
      sbpcfgStats.size
    )
  }

  /**
   * 内部解析方法（调用库）
   */
  private async parseInternal(
    sbpBuffer: ArrayBuffer,
    sbpcfgBuffer: ArrayBuffer,
    blueprintName: string
  ): Promise<unknown> {
    try {
      const blueprint = Parser.ParseBlueprintFiles(
        blueprintName,
        sbpBuffer,
        sbpcfgBuffer
      )
      return blueprint
    } catch (error) {
      throw new ParseError(
        `Parser.ParseBlueprintFiles failed: ${error instanceof Error ? error.message : String(error)}`,
        error
      )
    }
  }

  /**
   * 从完整的 Blueprint 对象提取元数据
   * @注意事项 直接返回库解析的完整对象，不进行提取
   */
  private extractMetadata(
    blueprint: unknown,
    blueprintId: string,
    sbpSize: number,
    sbpcfgSize: number
  ): BlueprintInfo {
    // 直接返回完整的 blueprint 对象
    return {
      blueprintId,
      parsedAt: Date.now(),
      fileSize: {
        sbp: sbpSize,
        sbpcfg: sbpcfgSize,
      },
      blueprint: blueprint as Record<string, unknown>, // 完整的蓝图对象
    }
  }

  /**
   * 根据文件路径推断对应的 .sbp 和 .sbpcfg 路径
   * @param filePath 可能是 .sbp 或 .sbpcfg 路径
   * @returns { sbpPath, sbpcfgPath }
   */
  inferBlueprintPaths(filePath: string): { sbpPath: string; sbpcfgPath: string } {
    const ext = filePath.slice(filePath.lastIndexOf('.'))
    const basePath = filePath.slice(0, filePath.lastIndexOf('.'))

    if (ext === '.sbp') {
      return {
        sbpPath: filePath,
        sbpcfgPath: `${basePath}.sbpcfg`,
      }
    } else if (ext === '.sbpcfg') {
      return {
        sbpPath: `${basePath}.sbp`,
        sbpcfgPath: filePath,
      }
    } else {
      // 默认假设是 .sbp
      return {
        sbpPath: `${filePath}.sbp`,
        sbpcfgPath: `${filePath}.sbpcfg`,
      }
    }
  }
}

export const blueprintParser = new BlueprintParser()

