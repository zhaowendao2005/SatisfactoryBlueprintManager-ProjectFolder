/**
 * localStorage服务
 * 封装配置持久化相关操作
 */
const STORAGE_KEY = 'satisfactory-blueprint-manager:last-config-id'

/**
 * localStorage服务类
 */
export class LocalStorageService {
  /**
   * 保存最后使用的配置ID
   */
  static saveLastConfigId(id: string): void {
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch (error) {
      console.error('Failed to save last config ID to localStorage:', error)
    }
  }

  /**
   * 获取最后使用的配置ID
   * @returns 配置ID，未设置返回null
   */
  static getLastConfigId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY)
    } catch (error) {
      console.error('Failed to get last config ID from localStorage:', error)
      return null
    }
  }

  /**
   * 清除最后使用的配置ID
   */
  static clearLastConfigId(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear last config ID from localStorage:', error)
    }
  }
}

