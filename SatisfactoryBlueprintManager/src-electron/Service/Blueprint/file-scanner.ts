/**
 * 文件扫描服务
 * 职责：递归遍历目录，生成蓝图节点树
 */
import { promises as fs } from 'fs'
import path from 'path'
import type { BlueprintNode, ScanDirectoryParams, ScanDirectoryResult } from '../../../public/types/blueprint'

/**
 * 文件数限制常量
 */
const MAX_FILE_COUNT = 500
const DEFAULT_MAX_DEPTH = 5
const DEFAULT_TIMEOUT = 10000

/**
 * 自定义错误类型
 */
export class FileLimitExceededError extends Error {
  constructor(public readonly fileCount: number) {
    super(`文件数量超过限制：${fileCount} > ${MAX_FILE_COUNT}`)
    this.name = 'FileLimitExceededError'
  }
}

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
 * 文件扫描服务
 */
export class FileScannerService {
  private fileCount = 0
  private warnings: string[] = []

  /**
   * 扫描目录（递归）
   */
  async scanDirectory(params: ScanDirectoryParams): Promise<ScanDirectoryResult> {
    const { path: dirPath, maxDepth = DEFAULT_MAX_DEPTH, timeout = DEFAULT_TIMEOUT } = params

    // 重置状态
    this.fileCount = 0
    this.warnings = []

    // 创建超时 Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError())
      }, timeout)
    })

    // 扫描 Promise
    const scanPromise = this.scanDirectoryRecursive(dirPath, 0, maxDepth)

    try {
      const tree = await Promise.race([scanPromise, timeoutPromise])

      return {
        tree,
        fileCount: this.fileCount,
        exceededLimit: this.fileCount > MAX_FILE_COUNT,
        warnings: this.warnings,
      }
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw error
      }
      throw error
    }
  }

  /**
   * 递归扫描目录
   */
  private async scanDirectoryRecursive(
    dirPath: string,
    currentDepth: number,
    maxDepth: number
  ): Promise<BlueprintNode> {
    // 检查深度限制
    if (currentDepth > maxDepth) {
      return this.createDirectoryNode(dirPath, [], currentDepth)
    }

    // 检查文件数限制
    if (this.fileCount > MAX_FILE_COUNT) {
      throw new FileLimitExceededError(this.fileCount)
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      const children: BlueprintNode[] = []

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)

        if (entry.isDirectory()) {
          // 递归扫描子目录
          try {
            const childNode = await this.scanDirectoryRecursive(fullPath, currentDepth + 1, maxDepth)
            children.push(childNode)
          } catch (error) {
            // 权限不足或其他错误，记录警告但继续扫描
            if (error instanceof PermissionError) {
              this.warnings.push(`无法访问目录：${fullPath}`)
            } else {
              this.warnings.push(`扫描目录失败：${fullPath} - ${error instanceof Error ? error.message : String(error)}`)
            }
          }
        } else if (entry.isFile() && entry.name.endsWith('.sbp')) {
          // 仅处理 .sbp 文件，跳过 .sbpcfg
          this.fileCount++
          if (this.fileCount > MAX_FILE_COUNT) {
            throw new FileLimitExceededError(this.fileCount)
          }

          const blueprintNode = this.createBlueprintNode(fullPath)
          children.push(blueprintNode)
        }
      }

      return this.createDirectoryNode(dirPath, children, currentDepth)
    } catch (error) {
      // 检查是否是权限错误
      if (error instanceof Error && 'code' in error && error.code === 'EACCES') {
        throw new PermissionError(dirPath)
      }
      throw error
    }
  }

  /**
   * 读取单层目录（非递归，用于懒加载）
   */
  async readDirectoryShallow(dirPath: string): Promise<BlueprintNode[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      const nodes: BlueprintNode[] = []

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)

        if (entry.isDirectory()) {
          nodes.push(this.createDirectoryNode(fullPath, undefined, 0))
        } else if (entry.isFile() && entry.name.endsWith('.sbp')) {
          nodes.push(this.createBlueprintNode(fullPath))
        }
      }

      return nodes
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'EACCES') {
        throw new PermissionError(dirPath)
      }
      throw error
    }
  }

  /**
   * 创建目录节点
   */
  private createDirectoryNode(
    dirPath: string,
    children: BlueprintNode[] | undefined,
    depth: number
  ): BlueprintNode {
    const normalizedPath = this.normalizePath(dirPath)
    const name = path.basename(dirPath) || dirPath

    return {
      id: normalizedPath,
      name,
      type: 'directory',
      path: normalizedPath,
      isActivated: false,
      children,
      isLeaf: children !== undefined && children.length === 0,
    }
  }

  /**
   * 创建蓝图节点
   */
  private createBlueprintNode(filePath: string): BlueprintNode {
    const normalizedPath = this.normalizePath(filePath)
    const name = path.basename(filePath, '.sbp')

    return {
      id: normalizedPath,
      name,
      type: 'blueprint',
      path: normalizedPath,
      isActivated: false,
      isLeaf: true,
    }
  }

  /**
   * 规范化路径（统一使用正斜杠）
   */
  private normalizePath(filePath: string): string {
    return path.normalize(filePath).replace(/\\/g, '/')
  }
}

export const fileScannerService = new FileScannerService()

