/**
 * 蓝图索引器
 * 职责：构建蓝图路径索引，支持通过 basename 查找源路径
 */
import fs from 'fs/promises'
import path from 'path'
import type { BlueprintIndex, IndexEntry } from '../../../public/types/sync'
import type { BlueprintSource } from '../../../public/types/blueprint'
import { fileScannerService } from '../Blueprint/file-scanner'
import { PathResolver } from './path-resolver'

/**
 * 蓝图索引器
 */
export class BlueprintIndexer {
  /**
   * 从蓝图源列表构建索引
   * @param sources 蓝图源列表
   * @returns 蓝图索引
   */
  static async buildIndex(sources: BlueprintSource[]): Promise<BlueprintIndex> {
    const entries: Record<string, IndexEntry[]> = {}

    for (const source of sources) {
      if (!source.enabled) {
        continue
      }

      try {
        // 扫描源目录，获取所有蓝图节点
        const scanResult = await fileScannerService.scanDirectory({
          path: source.path,
          maxDepth: 5,
        })

        // 遍历树结构，提取所有蓝图文件
        await this.extractBlueprintEntries(scanResult.tree, source, entries)
      } catch (error) {
        console.warn(`Failed to scan source ${source.name}:`, error)
        // 继续处理其他源
      }
    }

    return {
      version: '1.0.0',
      createdAt: Date.now(),
      entries,
    }
  }

  /**
   * 从树节点提取蓝图条目
   * @param node 树节点
   * @param source 蓝图源
   * @param entries 条目映射（会被修改）
   */
  private static async extractBlueprintEntries(
    node: any,
    source: BlueprintSource,
    entries: Record<string, IndexEntry[]>
  ): Promise<void> {
    if (node.type === 'blueprint') {
      const normalizedPath = PathResolver.normalizePath(node.path)
      const basename = path.basename(normalizedPath, '.sbp')
      const relativePath = path.relative(source.path, normalizedPath)

      // 获取文件修改时间
      let lastModified = Date.now()
      try {
        const stat = await fs.stat(normalizedPath)
        lastModified = stat.mtimeMs
      } catch {
        // 如果无法获取文件信息，使用当前时间
      }

      const entry: IndexEntry = {
        fullPath: normalizedPath,
        sourceName: source.name,
        relativePath: PathResolver.normalizePath(relativePath),
        lastModified,
      }

      if (!entries[basename]) {
        entries[basename] = []
      }
      entries[basename].push(entry)
    }

    // 递归处理子节点
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        await this.extractBlueprintEntries(child, source, entries)
      }
    }
  }

  /**
   * 保存索引到文件
   * @param index 索引对象
   * @param filePath 文件路径
   */
  static async saveIndex(index: BlueprintIndex, filePath: string): Promise<void> {
    const normalizedPath = PathResolver.normalizePath(filePath)
    const dir = path.dirname(normalizedPath)

    // 确保目录存在
    await fs.mkdir(dir, { recursive: true })

    // 序列化索引（Map 转为普通对象）
    const serializable = {
      version: index.version,
      createdAt: index.createdAt,
      entries: index.entries,
    }

    await fs.writeFile(normalizedPath, JSON.stringify(serializable, null, 2), 'utf-8')
  }

  /**
   * 从文件加载索引
   * @param filePath 文件路径
   * @returns 索引对象
   */
  static async loadIndex(filePath: string): Promise<BlueprintIndex> {
    const normalizedPath = PathResolver.normalizePath(filePath)

    try {
      const content = await fs.readFile(normalizedPath, 'utf-8')
      const data = JSON.parse(content) as {
        version: string
        createdAt: number
        entries: Record<string, IndexEntry[]>
      }

      return {
        version: data.version,
        createdAt: data.createdAt,
        entries: data.entries,
      }
    } catch (error) {
      // 如果文件不存在或损坏，返回空索引
      console.warn('Failed to load index, returning empty index:', error)
      return {
        version: '1.0.0',
        createdAt: Date.now(),
        entries: {},
      }
    }
  }

  /**
   * 查询蓝图的源路径（通过 basename）
   * @param basename 文件基础名（不含后缀）
   * @param index 索引对象
   * @returns 匹配的条目列表
   */
  static querySource(basename: string, index: BlueprintIndex): IndexEntry[] {
    return index.entries[basename] || []
  }
}

