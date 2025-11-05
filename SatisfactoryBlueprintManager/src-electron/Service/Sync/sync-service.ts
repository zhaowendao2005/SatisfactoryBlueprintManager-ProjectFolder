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
   * 游戏→库同步
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

    log('=== 开始游戏→库同步 ===')
    log('源路径', { sourcePath: normalizedSourcePath })
    log('同步模式', { mode: params.mode })
    log('备选路径', { fallbackPath: params.fallbackPath })

    try {
      // 步骤1：扫描游戏目录下所有 .sbp 文件
      log('步骤1：扫描游戏蓝图目录', { path: normalizedSourcePath })
      const blueprintPairs = await this.scanGameBlueprints(normalizedSourcePath)
      log('✓ 扫描完成', { count: blueprintPairs.length })

      // 步骤2：对每个蓝图对进行处理
      log('步骤2：处理每个蓝图对', { total: blueprintPairs.length })
      for (const pair of blueprintPairs) {
        if (signal?.aborted) {
          log('同步被取消')
          break
        }

        log(`\n处理蓝图: ${pair.basename}`, { 
          sourcePath: pair.sbpPath,
        })

        try {
          // 查询索引，找到对应的源路径
          log('查询索引中的匹配项...')
          const candidates = BlueprintIndexer.querySource(pair.basename, params.index)
          log(`找到${candidates.length}个匹配项`, { 
            candidates: candidates.map(c => c.fullPath)
          })

          let targetPath: string | null = null

          if (candidates.length === 0) {
            // 找不到映射 → 使用 fallbackPath，文件名前加 4 位哈希
            log('⚠ 未找到映射，使用备选路径')
            const hash = this.generateHash4(pair.sbpPath)
            const fallbackBasename = `${hash}-${pair.basename}`
            targetPath = path.join(params.fallbackPath, `${fallbackBasename}.sbp`)
            log('备选路径', { targetPath })
          } else if (candidates.length === 1) {
            // 唯一匹配
            log('✓ 找到唯一匹配')
            targetPath = candidates[0].fullPath
          } else {
            // 多个匹配 → 跳过（UI 层会弹出对话框让用户选择）
            log('⚠ 找到多个匹配，需要用户选择')
            result.skipped.push({
              pair,
              reason: '多个匹配源，需要用户选择',
            })
            continue
          }

          if (!targetPath) {
            continue
          }

          const normalizedTargetPath = PathResolver.normalizePath(targetPath)
          const targetDir = path.dirname(normalizedTargetPath)

          // 根据 mode 决定是否复制
          log(`检查同步模式 (${params.mode})...`)
          const shouldCopy = await this.shouldCopyByMode(
            pair.sbpPath,
            normalizedTargetPath,
            params.mode
          )

          if (!shouldCopy) {
            log(`✓ 跳过（${params.mode} 模式下无需更新）`)
            result.skipped.push({
              pair,
              reason: `根据 ${params.mode} 模式，目标已是最新或无需更新`,
            })
            continue
          }

          log('检查目标文件占用状态...')
          // 检查目标文件是否被占用
          const lockStatus = await this.checkFileLock(normalizedTargetPath)
          if (lockStatus.isLocked) {
            log('✗ 文件被占用', { path: normalizedTargetPath })
            result.failed.push({
              pair,
              error: '文件被游戏进程占用，请关闭游戏后重试',
            })
            continue
          }

          // 执行复制
          log('开始复制文件...')
          if (params.mode === 'new-version') {
            // 新版本模式：生成新文件名
            const timestamp = Date.now()
            const newBasename = `${pair.basename}.${timestamp}`
            log('新版本模式', { newBasename })
            await FileOperationService.copyBlueprintPair(pair.sbpPath, targetDir, {
              newName: newBasename,
            })
            log('✓ 新版本复制成功', { targetPath: path.join(targetDir, `${newBasename}.sbp`) })
          } else {
            // 其他模式：覆盖或复制
            log('普通复制', { targetDir })
            await FileOperationService.copyBlueprintPair(pair.sbpPath, targetDir)
            log('✓ 复制成功', { targetPath: normalizedTargetPath })
          }

          result.succeeded.push(pair)
        } catch (error) {
          log('✗ 处理失败', { error: error instanceof Error ? error.message : String(error) })
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
   * 根据同步模式判断是否应该复制
   * @param sourcePath 源文件路径
   * @param destPath 目标文件路径
   * @param mode 同步模式
   * @returns 是否应该复制
   */
  private static async shouldCopyByMode(
    sourcePath: string,
    destPath: string,
    mode: 'diff' | 'full' | 'latest' | 'new-version'
  ): Promise<boolean> {
    if (mode === 'full' || mode === 'new-version') {
      return true
    }

    try {
      const sourceStat = await fs.stat(sourcePath)
      const destStat = await fs.stat(destPath).catch(() => null)

      if (!destStat) {
        // 目标不存在，需要复制
        return true
      }

      if (mode === 'diff') {
        // diff 模式：仅复制更新的
        return (
          sourceStat.mtimeMs > destStat.mtimeMs || sourceStat.size !== destStat.size
        )
      }

      if (mode === 'latest') {
        // latest 模式：保留最新的
        return sourceStat.mtimeMs > destStat.mtimeMs
      }
    } catch {
      // 如果无法获取文件信息，默认复制
      return true
    }

    return false
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

