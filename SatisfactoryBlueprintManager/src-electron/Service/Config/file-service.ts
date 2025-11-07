/**
 * 配置文件服务（Electron 主进程）
 * 负责配置文件的读写操作
 */
import { promises as fs } from 'fs'
import path from 'path'
import { app } from 'electron'
import type { ConfigMeta, ConfigFileData } from '../../../public/types/config'

/**
 * 获取东八区时间字符串
 */
function getCSTTimeString(): string {
  const now = new Date()
  const cstOffset = 8 * 60 // 东八区 UTC+8，单位：分钟
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  const cst = new Date(utc + (cstOffset * 60000))
  
  const year = cst.getFullYear()
  const month = String(cst.getMonth() + 1).padStart(2, '0')
  const day = String(cst.getDate()).padStart(2, '0')
  const hours = String(cst.getHours()).padStart(2, '0')
  const minutes = String(cst.getMinutes()).padStart(2, '0')
  const seconds = String(cst.getSeconds()).padStart(2, '0')
  const milliseconds = String(cst.getMilliseconds()).padStart(3, '0')
  
  return `[${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds} CST]`
}

/**
 * 日志函数
 */
function log(message: string, ...args: unknown[]): void {
  console.log(`${getCSTTimeString()} ${message}`, ...args)
}

const CONFIG_DIR_NAME = 'ActiveBlueprintConfig'
const CONFIG_FILE_EXT = '.json'

/**
 * 获取配置目录路径
 */
function getConfigDir(): string {
  const userData = app.getPath('userData')
  return path.join(userData, 'Data', CONFIG_DIR_NAME)
}

/**
 * 获取配置文件路径
 */
function getConfigFilePath(configId: string): string {
  return path.join(getConfigDir(), `${configId}${CONFIG_FILE_EXT}`)
}

/**
 * 确保配置目录存在
 */
async function ensureConfigDir(): Promise<void> {
  const configDir = getConfigDir()
  try {
    await fs.access(configDir)
  } catch {
    await fs.mkdir(configDir, { recursive: true })
  }
}

/**
 * 读取配置文件内容
 */
async function readConfigFile(configId: string): Promise<ConfigFileData | null> {
  const filePath = getConfigFilePath(configId)
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const config = JSON.parse(content) as ConfigFileData
    log(`读取配置文件: ${configId}`, { name: config.name, treeNodes: config.tree.length })
    return config
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      log(`配置文件不存在: ${configId}`)
      return null
    }
    log(`读取配置文件失败: ${configId}`, error)
    return null
  }
}

/**
 * 写入配置文件
 */
async function writeConfigFile(data: ConfigFileData): Promise<void> {
  await ensureConfigDir()
  const filePath = getConfigFilePath(data.id)
  const content = JSON.stringify(data, null, 2)
  await fs.writeFile(filePath, content, 'utf-8')
  log(`保存配置文件: ${data.id}`, { 
    name: data.name, 
    treeNodes: data.tree.length,
    fileSize: `${(content.length / 1024).toFixed(2)} KB`
  })
}

/**
 * 删除配置文件
 */
async function deleteConfigFile(configId: string): Promise<void> {
  const filePath = getConfigFilePath(configId)
  try {
    await fs.unlink(filePath)
    log(`删除配置文件: ${configId}`)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      log(`删除配置文件失败: ${configId}`, error)
      throw error
    }
    log(`配置文件不存在，跳过删除: ${configId}`)
  }
}

/**
 * 列出所有配置文件
 */
async function listConfigFiles(): Promise<ConfigMeta[]> {
  await ensureConfigDir()
  const configDir = getConfigDir()
  
  try {
    const files = await fs.readdir(configDir)
    const configs: ConfigMeta[] = []
    
    for (const file of files) {
      if (!file.endsWith(CONFIG_FILE_EXT)) {
        continue
      }
      
      const configId = file.slice(0, -CONFIG_FILE_EXT.length)
      const configData = await readConfigFile(configId)
      
      if (configData) {
        configs.push({
          id: configData.id,
          name: configData.name,
          createdAt: configData.createdAt,
          updatedAt: configData.updatedAt,
        })
      }
    }
    
    // 按创建时间倒序排序
    configs.sort((a, b) => b.createdAt - a.createdAt)
    log(`列出配置文件: 共 ${configs.length} 个`, configs.map(c => ({ id: c.id, name: c.name })))
    return configs
  } catch (error) {
    log('列出配置文件失败', error)
    return []
  }
}

/**
 * 配置文件服务类
 */
export class ConfigFileService {
  /**
   * 列出所有配置（仅元信息）
   */
  async listConfigs(): Promise<ConfigMeta[]> {
    return await listConfigFiles()
  }

  /**
   * 加载完整配置数据
   */
  async loadConfig(configId: string): Promise<ConfigFileData | null> {
    return await readConfigFile(configId)
  }

  /**
   * 保存配置数据
   */
  async saveConfig(data: ConfigFileData): Promise<void> {
    const configData: ConfigFileData = {
      ...data,
      updatedAt: Date.now(),
    }
    await writeConfigFile(configData)
  }

  /**
   * 删除配置
   */
  async deleteConfig(configId: string): Promise<void> {
    await deleteConfigFile(configId)
  }

  /**
   * 重命名配置
   */
  async renameConfig(configId: string, newName: string): Promise<void> {
    const configData = await readConfigFile(configId)
    if (!configData) {
      log(`重命名配置失败: 配置不存在 ${configId}`)
      throw new Error(`配置不存在: ${configId}`)
    }
    
    const oldName = configData.name
    configData.name = newName
    configData.updatedAt = Date.now()
    await writeConfigFile(configData)
    log(`重命名配置: ${configId}`, { oldName, newName })
  }
}

export const configFileService = new ConfigFileService()

