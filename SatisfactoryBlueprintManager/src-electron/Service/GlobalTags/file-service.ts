/**
 * 全局标签文件服务（Electron 主进程）
 * 负责全局标签配置文件的读写操作
 */
import { promises as fs } from 'fs'
import path from 'path'
import { app } from 'electron'

/**
 * 全局标签配置数据结构
 */
export interface GlobalTagsConfig {
  version: string
  tags: Array<{
    id: string
    name: string
    color: string
  }>
  blueprintTags: Record<string, string[]> // key: blueprintPath, value: tagId[]
}

const GLOBAL_TAGS_FILE_NAME = 'global-tags.json'

/**
 * 获取全局标签文件路径
 */
function getGlobalTagsFilePath(): string {
  const userData = app.getPath('userData')
  return path.join(userData, 'Data', GLOBAL_TAGS_FILE_NAME)
}

/**
 * 确保数据目录存在
 */
async function ensureDataDir(): Promise<void> {
  const userData = app.getPath('userData')
  const dataDir = path.join(userData, 'Data')
  try {
    await fs.access(dataDir)
  } catch {
    await fs.mkdir(dataDir, { recursive: true })
  }
}

/**
 * 读取全局标签配置
 */
async function readGlobalTagsFile(): Promise<GlobalTagsConfig | null> {
  const filePath = getGlobalTagsFilePath()
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const config = JSON.parse(content) as GlobalTagsConfig
    console.log(`读取全局标签配置: ${config.tags.length} 个标签`)
    return config
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('全局标签配置文件不存在，返回默认配置')
      return null
    }
    console.error('读取全局标签配置失败:', error)
    return null
  }
}

/**
 * 写入全局标签配置
 */
async function writeGlobalTagsFile(data: GlobalTagsConfig): Promise<void> {
  await ensureDataDir()
  const filePath = getGlobalTagsFilePath()
  const content = JSON.stringify(data, null, 2)
  await fs.writeFile(filePath, content, 'utf-8')
  console.log(`保存全局标签配置: ${data.tags.length} 个标签, ${Object.keys(data.blueprintTags).length} 个蓝图关联`)
}

/**
 * 全局标签文件服务类
 */
export class GlobalTagsFileService {
  /**
   * 加载全局标签配置
   */
  async loadGlobalTags(): Promise<GlobalTagsConfig> {
    const config = await readGlobalTagsFile()
    if (!config) {
      // 返回默认配置
      return {
        version: '1.0.0',
        tags: [],
        blueprintTags: {},
      }
    }
    return config
  }

  /**
   * 保存全局标签配置
   */
  async saveGlobalTags(data: GlobalTagsConfig): Promise<void> {
    await writeGlobalTagsFile(data)
  }
}

export const globalTagsFileService = new GlobalTagsFileService()

