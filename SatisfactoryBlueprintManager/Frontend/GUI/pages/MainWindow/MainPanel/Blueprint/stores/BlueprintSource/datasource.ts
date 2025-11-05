/**
 * BlueprintSource 数据源适配器（文件系统实现）
 */
import type { BlueprintNode, BlueprintSource } from '../../types'
import type { IBlueprintSourceDatasource } from './types'
// 直接定义类型，避免跨层级导入问题
interface SelectDirectoryResult {
  canceled: boolean
  path?: string
}

interface ScanDirectoryResult {
  tree: BlueprintNode
  fileCount: number
  warnings: string[]
}

interface SourceConfigFile {
  version: string
  sourceId: string
  sourceName: string
  createdAt: number
  lastScannedAt: number
  metadata?: {
    fileCount?: number
    totalSize?: number
  }
}

/**
 * localStorage 键名
 */
const STORAGE_KEY_SOURCES = 'blueprintSources'

/**
 * 自定义错误类型
 */
export class TimeoutError extends Error {
  constructor() {
    super('扫描超时')
    this.name = 'TimeoutError'
  }
}

export class PermissionError extends Error {
  constructor(public readonly dirPath: string) {
    super(`无法访问目录：${dirPath}`)
    this.name = 'PermissionError'
  }
}

/**
 * BlueprintSource 数据源适配器（文件系统实现）
 */
class BlueprintSourceDatasource implements IBlueprintSourceDatasource {
  /**
   * 缓存：节点树数据（按源 id 索引）
   */
  private nodeCache: Map<string, BlueprintNode> = new Map()

  /**
   * 缓存：子节点数据（按节点 id 索引）
   */
  private childrenCache: Map<string, BlueprintNode[]> = new Map()

  /**
   * 获取 Electron API
   */
  private getBlueprintAPI() {
    const api = window.blueprintAPI
    if (!api) {
      throw new Error('蓝图 API 不可用，请确保在 Electron 环境中运行')
    }
    return api
  }

  /**
   * 获取所有蓝图源（从 localStorage 读取）
   */
  getSources(): Promise<BlueprintSource[]> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SOURCES)
      if (!stored) {
        return Promise.resolve([])
      }
      return Promise.resolve(JSON.parse(stored) as BlueprintSource[])
    } catch (error) {
      console.error('读取蓝图源列表失败:', error)
      return Promise.resolve([])
    }
  }

  /**
   * 保存蓝图源列表（到 localStorage）
   */
  private saveSources(sources: BlueprintSource[]): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY_SOURCES, JSON.stringify(sources))
      return Promise.resolve()
    } catch (error) {
      return Promise.reject(new Error(`保存蓝图源列表失败: ${error instanceof Error ? error.message : String(error)}`))
    }
  }

  /**
   * 获取根节点列表（将 sources 转换为根节点）
   */
  async getRootNodes(): Promise<BlueprintNode[]> {
    const sources = await this.getSources()
    const rootNodes: BlueprintNode[] = []

    for (const source of sources) {
      if (!source.enabled) {
        continue
      }

      // 从缓存获取或扫描
      let rootNode = this.nodeCache.get(source.id)

      if (!rootNode) {
        // 扫描源目录
        try {
          const scanResult = await this.getBlueprintAPI().scanDirectory({
            path: source.path,
            maxDepth: 5,
            timeout: 10000,
          })

          // 调整根节点：确保 id 和 name 与 source 匹配
          // 注意：扫描返回的树节点的 id 是路径，我们需要保持路径作为 id（用于懒加载）
          // 但根节点的 name 应该使用 source.name
          // 重要：el-tree 的 lazy 模式会忽略 children，所以我们需要将 children 设为 undefined
          // 这样 el-tree 才会调用 load 函数来加载子节点
          const rootNodeId = scanResult.tree.id // 根节点的路径（已规范化）
          // 创建根节点，移除 children 属性（el-tree lazy 模式需要）
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { children, ...treeWithoutChildren } = scanResult.tree
          rootNode = {
            ...treeWithoutChildren,
            id: rootNodeId, // 确保使用规范化后的路径
            name: source.name, // 使用 source 的名称
            isLeaf: false, // 明确标记为非叶子节点
            // children 不设置，让 el-tree 通过懒加载加载
          }
          
          // 将扫描到的子节点缓存起来，供懒加载时使用
          // 使用根节点的 id（路径）作为缓存键
          if (scanResult.tree.children && scanResult.tree.children.length > 0) {
            this.childrenCache.set(rootNodeId, scanResult.tree.children)
            console.log(`缓存根节点子节点: ${rootNodeId}, 子节点数: ${scanResult.tree.children.length}`)
          }
          this.nodeCache.set(source.id, rootNode)
        } catch (error) {
          console.error(`扫描源 ${source.name} 失败:`, error)
          // 创建错误节点
          rootNode = {
            id: source.path, // 使用路径作为 id，保持一致性
            name: source.name,
            type: 'directory',
            path: source.path,
            isActivated: false,
            children: [],
            isLeaf: true,
          }
        }
      }

      rootNodes.push(rootNode)
    }

    return rootNodes
  }

  /**
   * 懒加载子节点
   */
  async getChildren(nodeId: string): Promise<BlueprintNode[]> {
    // 规范化路径（确保与缓存键一致）
    const normalizedNodeId = nodeId.replace(/\\/g, '/')
    
    // 检查缓存
    if (this.childrenCache.has(normalizedNodeId)) {
      const cached = this.childrenCache.get(normalizedNodeId)!
      console.log(`从缓存获取子节点: ${normalizedNodeId}, 子节点数: ${cached.length}`)
      return cached
    }

    try {
      // 调用 IPC 读取单层目录
      const children = await this.getBlueprintAPI().readDirectoryShallow(normalizedNodeId)
      this.childrenCache.set(normalizedNodeId, children)
      console.log(`从 IPC 获取子节点: ${normalizedNodeId}, 子节点数: ${children.length}`)
      return children
    } catch (error) {
      console.error(`读取子节点失败 ${normalizedNodeId}:`, error)
      throw error
    }
  }

  /**
   * 激活蓝图
   */
  async activateBlueprint(_nodeId: string): Promise<void> {
    // 实际激活逻辑由 Store 层处理，这里仅占位
    // 未来可能需要更新配置文件或发送 IPC 消息
    void _nodeId
    return Promise.resolve()
  }

  /**
   * 取消激活蓝图
   */
  async deactivateBlueprint(_nodeId: string): Promise<void> {
    // 实际取消激活逻辑由 Store 层处理，这里仅占位
    void _nodeId
    return Promise.resolve()
  }

  /**
   * 添加蓝图源
   */
  async addSource(source: BlueprintSource): Promise<void> {
    const sources = await this.getSources()

    // 检查是否已存在
    if (sources.some((s) => s.path === source.path)) {
      throw new Error('该路径已存在')
    }

    // 添加到列表
    sources.push(source)
    await this.saveSources(sources)

    // 清除缓存，强制重新扫描
    this.nodeCache.delete(source.id)
    this.childrenCache.clear()
  }

  /**
   * 刷新蓝图源
   */
  async refresh(sourceId?: string): Promise<void> {
    if (sourceId) {
      // 刷新单个源
      this.nodeCache.delete(sourceId)
      // 清除该源的所有子节点缓存
      const source = (await this.getSources()).find((s) => s.id === sourceId)
      if (source) {
        this.clearChildrenCacheForPath(source.path)
      }
    } else {
      // 刷新所有源
      this.nodeCache.clear()
      this.childrenCache.clear()
    }
  }

  /**
   * 删除蓝图源
   */
  async removeSource(sourcePath: string): Promise<void> {
    const sources = await this.getSources()
    // 标准化路径后再比较
    const normalizedPath = sourcePath.replace(/\\/g, '/')
    const sourceIndex = sources.findIndex((s) => {
      const normalizedSourcePath = s.path.replace(/\\/g, '/')
      return normalizedSourcePath === normalizedPath
    })

    if (sourceIndex === -1) {
      console.warn('未找到匹配的源，尝试删除所有匹配的源')
      console.log('目标路径:', normalizedPath)
      console.log('现有源:', sources.map(s => ({
        id: s.id,
        path: s.path,
        normalizedPath: s.path.replace(/\\/g, '/')
      })))
      // 宽松匹配：如果找不到精确匹配，就删除所有源（用户说了"命中对应的状态并且从localstrage里面清掉就行了"）
      if (sources.length > 0) {
        // 清空所有源
        await this.saveSources([])
        this.nodeCache.clear()
        this.childrenCache.clear()
        return
      }
      throw new Error('源不存在')
    }

    const source = sources[sourceIndex]

    // 从列表中移除
    sources.splice(sourceIndex, 1)
    await this.saveSources(sources)

    // 清除缓存
    this.nodeCache.delete(source.id)
    this.clearChildrenCacheForPath(source.path)
  }

  /**
   * 清除指定路径下的所有子节点缓存
   */
  private clearChildrenCacheForPath(basePath: string): void {
    const keysToDelete: string[] = []
    for (const key of this.childrenCache.keys()) {
      if (key.startsWith(basePath)) {
        keysToDelete.push(key)
      }
    }
    for (const key of keysToDelete) {
      this.childrenCache.delete(key)
    }
  }

  /**
   * 选择目录并添加源（完整流程）
   */
  async selectAndAddSource(): Promise<BlueprintSource> {
    const api = this.getBlueprintAPI()

    // 1. 选择目录
    const selectResult: SelectDirectoryResult = await api.selectDirectory()

    if (selectResult.canceled || !selectResult.path) {
      throw new Error('用户取消了选择')
    }

    const selectedPath = selectResult.path

    // 2. 检查是否已存在
    const existingSources = await this.getSources()
    if (existingSources.some((s) => s.path === selectedPath)) {
      throw new Error('该路径已存在')
    }

    // 3. 扫描目录（验证有效性）
    let scanResult: ScanDirectoryResult
    try {
      scanResult = await api.scanDirectory({
        path: selectedPath,
        maxDepth: 5,
        timeout: 10000,
      })
    } catch (error) {
      // 转换错误类型（IPC 错误通过消息传递，需要从消息中识别）
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('超时') || errorMessage.includes('Timeout')) {
        throw new TimeoutError()
      }
      if (errorMessage.includes('无法访问') || errorMessage.includes('Permission') || errorMessage.includes('EACCES')) {
        throw new PermissionError(selectedPath)
      }
      throw error
    }

    // 5. 读取或创建配置文件
    const existingConfig = await api.readSourceConfig(selectedPath)
    const sourceId = existingConfig?.sourceId ?? `source-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const sourceName = existingConfig?.sourceName ?? (getBasename(selectedPath) || selectedPath)

    const config: SourceConfigFile = {
      version: '1.0.0',
      sourceId,
      sourceName,
      createdAt: existingConfig?.createdAt ?? Date.now(),
      lastScannedAt: Date.now(),
      metadata: {
        fileCount: scanResult.fileCount,
      },
    }

    try {
      await api.writeSourceConfig(selectedPath, config)
    } catch (error) {
      console.warn('写入配置文件失败（不影响添加源）:', error)
    }

    // 6. 创建源对象
    const newSource: BlueprintSource = {
      id: sourceId,
      name: sourceName,
      path: selectedPath,
      enabled: true,
    }

    // 7. 保存到列表
    await this.addSource(newSource)

    // 8. 缓存扫描结果（调整根节点名称，移除 children 供懒加载使用）
    const rootNodeId = scanResult.tree.id // 根节点的路径（已规范化）
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { children, ...treeWithoutChildren } = scanResult.tree
    const rootNode: BlueprintNode = {
      ...treeWithoutChildren,
      id: rootNodeId, // 确保使用规范化后的路径
      name: sourceName, // 使用 source 的名称
      isLeaf: false, // 明确标记为非叶子节点
      // children 不设置，让 el-tree 通过懒加载加载
    }
    this.nodeCache.set(sourceId, rootNode)
    
    // 将扫描到的子节点缓存起来，供懒加载时使用
    if (scanResult.tree.children && scanResult.tree.children.length > 0) {
      this.childrenCache.set(rootNodeId, scanResult.tree.children)
      console.log(`缓存新源根节点子节点: ${rootNodeId}, 子节点数: ${scanResult.tree.children.length}`)
    }

    return newSource
  }

  /**
   * 重新扫描源目录（用于刷新）
   */
  async rescanSource(sourceId: string): Promise<BlueprintNode[]> {
    const sources = await this.getSources()
    const source = sources.find((s) => s.id === sourceId)

    if (!source) {
      throw new Error(`源不存在: ${sourceId}`)
    }

    // 清除缓存
    this.nodeCache.delete(sourceId)
    this.clearChildrenCacheForPath(source.path)

    // 重新扫描
    const scanResult = await this.getBlueprintAPI().scanDirectory({
      path: source.path,
      maxDepth: 5,
      timeout: 10000,
    })

    // 更新缓存（调整根节点名称，移除 children 供懒加载使用）
    const rootNodeId = scanResult.tree.id // 根节点的路径（已规范化）
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { children, ...treeWithoutChildren } = scanResult.tree
    const rootNode: BlueprintNode = {
      ...treeWithoutChildren,
      id: rootNodeId, // 确保使用规范化后的路径
      name: source.name, // 使用 source 的名称
      isLeaf: false, // 明确标记为非叶子节点
      // children 不设置，让 el-tree 通过懒加载加载
    }
    this.nodeCache.set(sourceId, rootNode)
    
    // 将扫描到的子节点缓存起来，供懒加载时使用
    if (scanResult.tree.children && scanResult.tree.children.length > 0) {
      this.childrenCache.set(rootNodeId, scanResult.tree.children)
      console.log(`缓存刷新源根节点子节点: ${rootNodeId}, 子节点数: ${scanResult.tree.children.length}`)
    }

    return [rootNode]
  }
}

/**
 * 辅助函数：获取路径的 basename
 */
function getBasename(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || filePath
}

export const blueprintSourceDatasource = new BlueprintSourceDatasource()
