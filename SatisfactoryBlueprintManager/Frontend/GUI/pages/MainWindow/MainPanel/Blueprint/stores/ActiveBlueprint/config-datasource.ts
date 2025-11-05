/**
 * 配置管理数据源
 * 负责与 Electron IPC 通信，管理配置文件的 CRUD 操作
 */
// 直接定义类型，避免跨层级相对路径导入问题
interface ConfigMeta {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

interface ConfigFileData {
  id: string
  name: string
  version: string
  createdAt: number
  updatedAt: number
  tree: Array<{
    id: string
    type: 'group' | 'blueprint'
    name: string
    blueprintId?: string
    path?: string
    sourcePath?: string
    children?: Array<{
      id: string
      type: 'group' | 'blueprint'
      name: string
      blueprintId?: string
      path?: string
      sourcePath?: string
      children?: unknown[]
    }>
  }>
}

/**
 * 配置管理数据源接口
 */
export interface IConfigDatasource {
  listConfigs(): Promise<ConfigMeta[]>
  loadConfig(id: string): Promise<ConfigFileData | null>
  saveConfig(data: ConfigFileData): Promise<void>
  deleteConfig(id: string): Promise<void>
  renameConfig(id: string, newName: string): Promise<void>
}

/**
 * 配置管理数据源实现
 */
class ConfigDatasource implements IConfigDatasource {
  private getConfigAPI() {
    const api = window.configAPI
    if (!api) {
      throw new Error('配置 API 不可用，请确保在 Electron 环境中运行')
    }
    return api
  }

  async listConfigs(): Promise<ConfigMeta[]> {
    try {
      return await this.getConfigAPI().listConfigs()
    } catch (error) {
      console.error('Failed to list configs:', error)
      throw error
    }
  }

  async loadConfig(id: string): Promise<ConfigFileData | null> {
    try {
      const config = await this.getConfigAPI().loadConfig(id)
      if (!config) {
        return null
      }
      // 深拷贝，确保返回的是可序列化的纯对象
      return JSON.parse(JSON.stringify(config)) as ConfigFileData
    } catch (error) {
      console.error(`Failed to load config ${id}:`, error)
      throw error
    }
  }

  async saveConfig(data: ConfigFileData): Promise<void> {
    try {
      // 深拷贝数据，确保是可序列化的纯对象（移除 Vue 响应式代理）
      const serializableData: ConfigFileData = JSON.parse(JSON.stringify(data))
      await this.getConfigAPI().saveConfig(serializableData)
    } catch (error) {
      console.error('Failed to save config:', error)
      throw error
    }
  }

  async deleteConfig(id: string): Promise<void> {
    try {
      await this.getConfigAPI().deleteConfig(id)
    } catch (error) {
      console.error(`Failed to delete config ${id}:`, error)
      throw error
    }
  }

  async renameConfig(id: string, newName: string): Promise<void> {
    try {
      await this.getConfigAPI().renameConfig(id, newName)
    } catch (error) {
      console.error(`Failed to rename config ${id}:`, error)
      throw error
    }
  }
}

export const configDatasource = new ConfigDatasource()

