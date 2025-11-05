/**
 * 配置文件管理服务
 * 职责：在蓝图源目录下创建/读取配置文件
 */
import { promises as fs } from 'fs'
import path from 'path'
import type { SourceConfigFile } from '../../../public/types/blueprint'

/**
 * 配置文件名称
 */
const CONFIG_FILE_NAME = 'SatisfactoryBlueprintManager.config.json'

/**
 * 配置文件管理服务
 */
export class ConfigManagerService {
  /**
   * 写入配置文件
   */
  async writeSourceConfig(sourcePath: string, config: SourceConfigFile): Promise<void> {
    const configPath = path.join(sourcePath, CONFIG_FILE_NAME)

    try {
      // 检查目录是否存在
      await fs.access(sourcePath)

      // 读取现有配置（如果存在）
      let existingConfig: SourceConfigFile | null = null
      try {
        existingConfig = await this.readSourceConfig(sourcePath)
      } catch {
        // 文件不存在，忽略错误
      }

      // 合并配置（保留 createdAt）
      const mergedConfig: SourceConfigFile = {
        ...config,
        createdAt: existingConfig?.createdAt ?? config.createdAt,
      }

      // 创建备份（如果文件已存在）
      try {
        await fs.access(configPath)
        const backupPath = `${configPath}.bak`
        await fs.copyFile(configPath, backupPath)
      } catch {
        // 文件不存在，无需备份
      }

      // 写入配置文件
      await fs.writeFile(configPath, JSON.stringify(mergedConfig, null, 2), 'utf-8')
    } catch (error) {
      throw new Error(`写入配置文件失败：${configPath} - ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 读取配置文件
   */
  async readSourceConfig(sourcePath: string): Promise<SourceConfigFile | null> {
    const configPath = path.join(sourcePath, CONFIG_FILE_NAME)

    try {
      const content = await fs.readFile(configPath, 'utf-8')
      const config = JSON.parse(content) as SourceConfigFile

      // 验证配置格式
      if (!config.version || !config.sourceId || !config.sourceName) {
        throw new Error('配置文件格式无效')
      }

      return config
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        // 文件不存在，返回 null
        return null
      }
      throw new Error(`读取配置文件失败：${configPath} - ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 检查配置文件是否存在
   */
  async configExists(sourcePath: string): Promise<boolean> {
    const configPath = path.join(sourcePath, CONFIG_FILE_NAME)
    try {
      await fs.access(configPath)
      return true
    } catch {
      return false
    }
  }
}

export const configManagerService = new ConfigManagerService()

