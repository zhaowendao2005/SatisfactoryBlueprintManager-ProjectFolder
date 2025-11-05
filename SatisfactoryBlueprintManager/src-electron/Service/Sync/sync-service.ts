/**
 * 同步服务
 * 职责：执行同步操作（库→游戏、游戏→库）
 */
import fs from 'fs/promises'
import path from 'path'
import type {
  SyncLibraryToGameParams,
  SyncGameToLibraryParams,
  SyncResult,
  BlueprintPair,
  FileLockStatus,
  BlueprintIndex,
  NewBlueprintsResult,
} from '../../../public/types/sync'
import type { ActiveBlueprintNode } from '../../../public/types/blueprint'
import { FileOperationService } from './file-operation-service'
import { PathResolver } from './path-resolver'
import { BlueprintIndexer } from './blueprint-indexer'

// 日志工具
const log = (message: string, data?: any) => {
  const timestamp = new Date().toISOString()
  if (data) {
    console.log(`[${timestamp}] [SYNC] ${message}`, data)
  } else {
    console.log(`[${timestamp}] [SYNC] ${message}`)
  }
}

/**
 * 同步服务
 */
export class SyncService {
  /**
   * 库→游戏同步
   * @param params 同步参数
   * @param signal 取消信号
   * @returns 同步结果
   */
  static async syncLibraryToGame(
    params: SyncLibraryToGameParams,
    signal?: AbortSignal
  ): Promise<SyncResult> {
    const startTime = Date.now()
    const result: SyncResult = {
      succeeded: [],
      failed: [],
      skipped: [],
      duration: 0,
    }

    const normalizedTargetPath = PathResolver.normalizePath(params.targetPath)
    
    log('=== 开始库→游戏同步 ===')
    log('目标路径', { targetPath: normalizedTargetPath })
    log('蓝图数量', { count: params.blueprints.length })
    log('是否备份', { hasBackup: !!params.backupPath })

    try {
      // 步骤1：检查目标目录是否存在，不存在则创建
      log('步骤1：检查/创建目标目录', { path: normalizedTargetPath })
      await fs.mkdir(normalizedTargetPath, { recursive: true })
      log('✓ 目标目录就绪')

      // 步骤2：如果提供了 backupPath，先备份整个目标目录
      if (params.backupPath) {
        try {
          log('步骤2：创建备份', { sourcePath: normalizedTargetPath, backupPath: params.backupPath })
          const backupPath = await FileOperationService.createTimestampedBackup(
            normalizedTargetPath,
            params.backupPath
          )
          result.backupPath = backupPath
          log('✓ 备份完成', { backupPath })
        } catch (error) {
          log('⚠ 备份失败', { error: error instanceof Error ? error.message : String(error) })
          // 备份失败不影响同步继续
        }
      }

      // 步骤3：清空目标目录
      log('步骤3：清空目标目录', { path: normalizedTargetPath })
      try {
        // 读取目录中的所有文件
        const entries = await fs.readdir(normalizedTargetPath, { withFileTypes: true })
        for (const entry of entries) {
          const entryPath = path.join(normalizedTargetPath, entry.name)
          if (entry.isDirectory()) {
            // 递归删除目录
            await fs.rm(entryPath, { recursive: true, force: true })
            log('删除目录', { path: entryPath })
          } else {
            // 删除文件
            await fs.unlink(entryPath)
            log('删除文件', { path: entryPath })
          }
        }
        log('✓ 目标目录已清空')
      } catch (error) {
        // 如果目录不存在或已经是空的，忽略错误
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          log('⚠ 清空目录时出错', { error: error instanceof Error ? error.message : String(error) })
          // 继续执行，不清空不影响复制
        }
      }

      // 步骤4：遍历激活的蓝图列表
      log('步骤4：开始复制蓝图', { count: params.blueprints.length })
      for (const blueprint of params.blueprints) {
        if (signal?.aborted) {
          log('同步被取消')
          break
        }

        if (blueprint.type !== 'blueprint' || !blueprint.path) {
          continue
        }

        const normalizedSourcePath = PathResolver.normalizePath(blueprint.path)
        const basename = path.basename(normalizedSourcePath, '.sbp')
        const destSbpPath = path.join(normalizedTargetPath, `${basename}.sbp`)
        
        log(`处理蓝图: ${blueprint.name}`, { 
          sourcePath: normalizedSourcePath,
          destPath: destSbpPath
        })

        try {
          // 检查源文件是否存在
          await fs.access(normalizedSourcePath)
          log('✓ 源文件存在')

          // 检查目标文件是否被占用
          const lockStatus = await this.checkFileLock(destSbpPath)
          if (lockStatus.isLocked) {
            log('✗ 目标文件被占用', { path: destSbpPath, lockedBy: lockStatus.lockedBy })
            result.failed.push({
              pair: {
                sbpPath: normalizedSourcePath,
                cfgPath: normalizedSourcePath.replace(/\.sbp$/, '.sbpcfg'),
                basename,
                lastModified: 0,
              },
              error: '文件被游戏进程占用，请关闭游戏后重试',
            })
            continue
          }

          // 复制蓝图对
          log('开始复制蓝图文件...')
          await FileOperationService.copyBlueprintPair(normalizedSourcePath, normalizedTargetPath)
          log('✓ 蓝图复制成功', { destPath: destSbpPath })

          // 获取文件信息
          const stat = await fs.stat(normalizedSourcePath)
          result.succeeded.push({
            sbpPath: normalizedSourcePath,
            cfgPath: normalizedSourcePath.replace(/\.sbp$/, '.sbpcfg'),
            basename,
            lastModified: stat.mtimeMs,
          })
        } catch (error) {
          log('✗ 蓝图复制失败', { 
            error: error instanceof Error ? error.message : String(error),
            sourcePath: normalizedSourcePath
          })
          result.failed.push({
            pair: {
              sbpPath: normalizedSourcePath,
              cfgPath: normalizedSourcePath.replace(/\.sbp$/, '.sbpcfg'),
              basename,
              lastModified: 0,
            },
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    } catch (error) {
      // 致命错误
      log('✗ 同步过程中出现致命错误', { error: error instanceof Error ? error.message : String(error) })
      throw error
    } finally {
      result.duration = Date.now() - startTime
      log('=== 库→游戏同步完成 ===', {
        成功: result.succeeded.length,
        失败: result.failed.length,
        跳过: result.skipped.length,
        耗时ms: result.duration,
        备份路径: result.backupPath || '无'
      })
    }

    return result
  }

  /**
   * 检测新增蓝图（不在索引中的蓝图）
   * @param gamePath 游戏存档蓝图目录
   * @param index 蓝图索引
   * @returns 新增蓝图列表
   */
  static async detectNewBlueprints(
    gamePath: string,
    index: BlueprintIndex
  ): Promise<NewBlueprintsResult> {
    log('=== 开始检测新增蓝图 ===')
    const normalizedGamePath = PathResolver.normalizePath(gamePath)
    
    // 扫描游戏目录中的所有蓝图
    const allBlueprints = await this.scanGameBlueprints(normalizedGamePath)
    log('游戏目录蓝图总数', { count: allBlueprints.length })
    
    // 找出不在索引中的蓝图（新增的）
    const newBlueprints: BlueprintPair[] = []
    for (const pair of allBlueprints) {
      const candidates = BlueprintIndexer.querySource(pair.basename, index)
      if (candidates.length === 0) {
        // 不在索引中，是新增的
        newBlueprints.push(pair)
        log('发现新增蓝图', { basename: pair.basename })
      }
    }
    
    log('=== 检测完成 ===', {
      新增: newBlueprints.length,
      总数: allBlueprints.length,
    })
    
    return {
      newBlueprints,
      totalBlueprints: allBlueprints.length,
    }
  }

  /**
   * 游戏→库同步（简化版：只处理新增蓝图）
   * @param params 同步参数
   * @param signal 取消信号
   * @returns 同步结果
   */
  static async syncGameToLibrary(
    params: SyncGameToLibraryParams,
    signal?: AbortSignal
  ): Promise<SyncResult> {
    const startTime = Date.now()
    const result: SyncResult = {
      succeeded: [],
      failed: [],
      skipped: [],
      duration: 0,
    }

    const normalizedSourcePath = PathResolver.normalizePath(params.sourcePath)
    const normalizedTargetPath = PathResolver.normalizePath(params.targetPath)

    log('=== 开始游戏→库同步（简化版：新增蓝图） ===')
    log('源路径', { sourcePath: normalizedSourcePath })
    log('目标路径', { targetPath: normalizedTargetPath })
    log('蓝图数量', { count: params.blueprints.length })

    try {
      // 步骤1：确保目标目录存在
      log('步骤1：检查/创建目标目录', { path: normalizedTargetPath })
      await fs.mkdir(normalizedTargetPath, { recursive: true })
      log('✓ 目标目录就绪')

      // 步骤2：复制每个新增蓝图
      log('步骤2：开始复制新增蓝图', { count: params.blueprints.length })
      for (const pair of params.blueprints) {
        if (signal?.aborted) {
          log('同步被取消')
          break
        }

        log(`处理蓝图: ${pair.basename}`, { 
          sourcePath: pair.sbpPath,
          targetDir: normalizedTargetPath
        })

        try {
          // 检查源文件是否存在
          await fs.access(pair.sbpPath)
          log('✓ 源文件存在')

          // 检查目标文件是否被占用
          const destSbpPath = path.join(normalizedTargetPath, `${pair.basename}.sbp`)
          const lockStatus = await this.checkFileLock(destSbpPath)
          if (lockStatus.isLocked) {
            log('✗ 目标文件被占用', { path: destSbpPath })
            result.failed.push({
              pair,
              error: '文件被游戏进程占用，请关闭游戏后重试',
            })
            continue
          }

          // 执行复制
          log('开始复制蓝图文件...')
          await FileOperationService.copyBlueprintPair(pair.sbpPath, normalizedTargetPath)
          log('✓ 蓝图复制成功', { destPath: destSbpPath })

          result.succeeded.push(pair)
        } catch (error) {
          log('✗ 蓝图复制失败', { 
            error: error instanceof Error ? error.message : String(error),
            sourcePath: pair.sbpPath
          })
          result.failed.push({
            pair,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    } catch (error) {
      log('✗ 同步过程中出现致命错误', { error: error instanceof Error ? error.message : String(error) })
      throw error
    } finally {
      result.duration = Date.now() - startTime
      log('=== 游戏→库同步完成 ===', {
        成功: result.succeeded.length,
        失败: result.failed.length,
        跳过: result.skipped.length,
        耗时ms: result.duration,
      })
    }

    return result
  }

  /**
   * 检查文件是否被占用
   * @param filePath 文件路径
   * @param timeout 超时时间（毫秒）
   * @returns 文件占用状态
   */
  static async checkFileLock(filePath: string, timeout = 5000): Promise<FileLockStatus> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve({ isLocked: false })
      }, timeout)

      fs.open(filePath, 'r+')
        .then((fd) => {
          fs.close(fd)
          clearTimeout(timer)
          resolve({ isLocked: false })
        })
        .catch((error: any) => {
          clearTimeout(timer)
          if (error.code === 'EBUSY' || error.code === 'EPERM') {
            resolve({ isLocked: true, lockedBy: '游戏进程' })
          } else {
            // 文件不存在或其他错误，视为未占用
            resolve({ isLocked: false })
          }
        })
    })
  }

  /**
   * 扫描存档目录下的所有蓝图
   * @param gamePath 游戏存档蓝图目录
   * @returns 蓝图对列表
   */
  static async scanGameBlueprints(gamePath: string): Promise<BlueprintPair[]> {
    const normalizedPath = PathResolver.normalizePath(gamePath)
    const pairs: BlueprintPair[] = []

    try {
      const entries = await fs.readdir(normalizedPath, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.sbp')) {
          const sbpPath = path.join(normalizedPath, entry.name)
          const cfgPath = sbpPath.replace(/\.sbp$/, '.sbpcfg')

          try {
            const stat = await fs.stat(sbpPath)
            const cfgExists = await fs
              .access(cfgPath)
              .then(() => true)
              .catch(() => false)

            pairs.push({
              sbpPath: PathResolver.normalizePath(sbpPath),
              cfgPath: cfgExists ? PathResolver.normalizePath(cfgPath) : null,
              basename: path.basename(sbpPath, '.sbp'),
              lastModified: stat.mtimeMs,
            })
          } catch {
            // 忽略无法访问的文件
          }
        }
      }
    } catch (error) {
      console.warn('Failed to scan game blueprints:', error)
    }

    return pairs
  }

  /**
   * 生成 4 位哈希
   * @param str 输入字符串
   * @returns 4 位哈希字符串
   */
  private static generateHash4(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // 转换为32位整数
    }
    const hash4 = Math.abs(hash % 10000)
    return String(hash4).padStart(4, '0')
  }
}

