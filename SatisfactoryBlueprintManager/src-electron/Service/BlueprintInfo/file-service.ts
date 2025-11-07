/**
 * 蓝图信息文件服务
 * 负责管理解析结果的文件存储
 */
import { promises as fs } from 'fs'
import path from 'path'
import { app } from 'electron'
import type { BlueprintInfo, BlueprintInfoIndex } from '../../../public/types/blueprint-info'

/**
 * 获取配置目录路径
 */
function getBlueprintInfoDir(): string {
  const userData = app.getPath('userData')
  return path.join(userData, 'Data', 'BlueprintInfo')
}

/**
 * 获取蓝图信息文件路径
 */
function getBlueprintInfoFilePath(blueprintId: string): string {
  return path.join(getBlueprintInfoDir(), `${blueprintId}.json`)
}

/**
 * 获取索引文件路径
 */
function getIndexFilePath(): string {
  return path.join(getBlueprintInfoDir(), '_index.json')
}

/**
 * 确保配置目录存在
 */
async function ensureBlueprintInfoDir(): Promise<void> {
  const dir = getBlueprintInfoDir()
  try {
    await fs.access(dir)
  } catch {
    await fs.mkdir(dir, { recursive: true })
  }
}

/**
 * 蓝图信息文件服务类
 */
export class BlueprintInfoFileService {
  /**
   * 保存蓝图信息到 JSON 文件
   * @param info 蓝图信息
   * @returns 文件路径
   */
  async save(info: BlueprintInfo): Promise<string> {
    await ensureBlueprintInfoDir()
    const filePath = getBlueprintInfoFilePath(info.blueprintId)
    const content = JSON.stringify(info, null, 2)
    await fs.writeFile(filePath, content, 'utf-8')
    return filePath
  }

  /**
   * 读取蓝图信息
   * @param blueprintId 蓝图 ID
   * @returns 蓝图信息，如果不存在返回 null
   */
  async read(blueprintId: string): Promise<BlueprintInfo | null> {
    const filePath = getBlueprintInfoFilePath(blueprintId)
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const info = JSON.parse(content) as BlueprintInfo
      return info
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null
      }
      throw error
    }
  }

  /**
   * 更新索引文件（记录所有已解析的 blueprintId）
   * @param blueprintIds 蓝图 ID 列表
   */
  async updateIndex(blueprintIds: string[]): Promise<void> {
    await ensureBlueprintInfoDir()
    const indexPath = getIndexFilePath()
    const index: BlueprintInfoIndex = {
      blueprintIds: [...new Set(blueprintIds)], // 去重
      updatedAt: Date.now(),
    }
    const content = JSON.stringify(index, null, 2)
    await fs.writeFile(indexPath, content, 'utf-8')
  }

  /**
   * 读取索引文件
   * @returns 已解析的 blueprintId 列表
   */
  async readIndex(): Promise<string[]> {
    const indexPath = getIndexFilePath()
    try {
      const content = await fs.readFile(indexPath, 'utf-8')
      const index = JSON.parse(content) as BlueprintInfoIndex
      return index.blueprintIds || []
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return []
      }
      throw error
    }
  }

  /**
   * 删除蓝图信息文件
   * @param blueprintId 蓝图 ID
   */
  async delete(blueprintId: string): Promise<void> {
    const filePath = getBlueprintInfoFilePath(blueprintId)
    try {
      await fs.unlink(filePath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }
}

export const blueprintInfoFileService = new BlueprintInfoFileService()

