/**
 * 文件操作服务
 * 职责：文件复制、备份等基础操作
 */
import fs from 'fs/promises'
import path from 'path'
import { PathResolver } from './path-resolver'

// 日志工具
const log = (message: string, data?: any) => {
  const timestamp = new Date().toISOString()
  if (data) {
    console.log(`[${timestamp}] [FILE-OP] ${message}`, data)
  } else {
    console.log(`[${timestamp}] [FILE-OP] ${message}`)
  }
}

/**
 * 文件操作服务
 */
export class FileOperationService {
  /**
   * 复制蓝图对（.sbp + .sbpcfg）
   * @param sbpPath .sbp 文件路径
   * @param destDir 目标目录
   * @param options 选项
   * @returns 复制结果
   */
  static async copyBlueprintPair(
    sbpPath: string,
    destDir: string,
    options?: { overwrite?: boolean; newName?: string }
  ): Promise<{ sbpCopied: boolean; cfgCopied: boolean }> {
    const normalizedSbpPath = PathResolver.normalizePath(sbpPath)
    const normalizedDestDir = PathResolver.normalizePath(destDir)

    log('复制蓝图对', { sbpPath: normalizedSbpPath, destDir: normalizedDestDir, options })

    // 确保目标目录存在
    log('创建目标目录', { path: normalizedDestDir })
    await fs.mkdir(normalizedDestDir, { recursive: true })
    log('✓ 目标目录创建完成')

    // 获取基础名称
    const basename = options?.newName || path.basename(normalizedSbpPath, '.sbp')
    const destSbpPath = path.join(normalizedDestDir, `${basename}.sbp`)

    // 复制 .sbp 文件
    log('复制 .sbp 文件', { from: normalizedSbpPath, to: destSbpPath })
    await fs.copyFile(normalizedSbpPath, destSbpPath)
    log('✓ .sbp 文件复制成功')

    // 检查并复制 .sbpcfg 文件
    const cfgPath = normalizedSbpPath.replace(/\.sbp$/, '.sbpcfg')
    let cfgCopied = false

    try {
      log('检查 .sbpcfg 文件', { path: cfgPath })
      await fs.access(cfgPath)
      const destCfgPath = path.join(normalizedDestDir, `${basename}.sbpcfg`)
      log('复制 .sbpcfg 文件', { from: cfgPath, to: destCfgPath })
      await fs.copyFile(cfgPath, destCfgPath)
      log('✓ .sbpcfg 文件复制成功')
      cfgCopied = true
    } catch {
      // .sbpcfg 文件不存在，忽略
      log('⚠ .sbpcfg 文件不存在（正常）')
    }

    log('✓ 蓝图对复制完成', { sbpCopied: true, cfgCopied })
    return { sbpCopied: true, cfgCopied }
  }

  /**
   * 创建时间戳备份
   * @param sourceDir 源目录
   * @param backupBaseDir 备份根目录
   * @returns 备份完整路径
   */
  static async createTimestampedBackup(
    sourceDir: string,
    backupBaseDir: string
  ): Promise<string> {
    const normalizedSourceDir = PathResolver.normalizePath(sourceDir)
    const normalizedBackupBaseDir = PathResolver.normalizePath(backupBaseDir)

    log('创建时间戳备份', { sourceDir: normalizedSourceDir, backupBaseDir: normalizedBackupBaseDir })

    // 确保备份根目录存在
    log('创建备份根目录', { path: normalizedBackupBaseDir })
    await fs.mkdir(normalizedBackupBaseDir, { recursive: true })

    // 生成时间戳目录名
    const now = new Date()
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    const backupDirName = `backup-${timestamp}`
    const backupPath = path.join(normalizedBackupBaseDir, backupDirName)

    // 递归复制源目录到备份目录
    log('开始复制源目录到备份位置', { from: normalizedSourceDir, to: backupPath })
    await fs.cp(normalizedSourceDir, backupPath, { recursive: true })
    log('✓ 备份复制完成')

    // 清理旧备份
    log('清理旧备份（限制总大小 1GB）', { backupBaseDir: normalizedBackupBaseDir })
    await this.cleanOldBackups(normalizedBackupBaseDir, 1) // 1GB

    log('✓ 备份完成', { backupPath })
    return PathResolver.normalizePath(backupPath)
  }

  /**
   * 清理旧备份（限制总大小）
   * @param backupBaseDir 备份根目录
   * @param maxSizeGB 最大大小（GB）
   */
  static async cleanOldBackups(backupBaseDir: string, maxSizeGB: number): Promise<void> {
    const normalizedBackupBaseDir = PathResolver.normalizePath(backupBaseDir)
    const maxSizeBytes = maxSizeGB * 1024 * 1024 * 1024 // 转换为字节

    log('清理备份', { maxSizeGB, maxSizeBytes })

    try {
      const entries = await fs.readdir(normalizedBackupBaseDir, { withFileTypes: true })
      const backupDirs = entries
        .filter((entry) => entry.isDirectory() && entry.name.startsWith('backup-'))
        .map((entry) => entry.name)
        .sort() // 按字典序排序（即时间序，最旧的在前）

      log('找到备份目录', { count: backupDirs.length, dirs: backupDirs })

      // 计算总大小
      let totalSize = 0
      const dirSizes: Array<{ name: string; size: number }> = []

      for (const dirName of backupDirs) {
        const dirPath = path.join(normalizedBackupBaseDir, dirName)
        const size = await this.calculateDirectorySize(dirPath)
        dirSizes.push({ name: dirName, size })
        totalSize += size
        log(`  ${dirName}: ${(size / (1024 * 1024)).toFixed(2)} MB`)
      }

      log('备份总大小', { total: `${(totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB` })

      // 如果总大小超过限制，删除最旧的备份
      if (totalSize > maxSizeBytes) {
        log('⚠ 备份大小超过限制，开始删除旧备份')
        for (const dirInfo of dirSizes) {
          if (totalSize <= maxSizeBytes) {
            break
          }
          const dirPath = path.join(normalizedBackupBaseDir, dirInfo.name)
          log('删除旧备份', { name: dirInfo.name, size: `${(dirInfo.size / (1024 * 1024)).toFixed(2)} MB` })
          await fs.rm(dirPath, { recursive: true, force: true })
          totalSize -= dirInfo.size
        }
        log('✓ 旧备份清理完成')
      } else {
        log('✓ 备份大小在限制范围内，无需清理')
      }
    } catch (error) {
      // 如果备份目录不存在或其他错误，忽略
      log('⚠ 清理备份失败', { error: error instanceof Error ? error.message : String(error) })
    }
  }

  /**
   * 计算目录大小
   * @param dirPath 目录路径
   * @returns 目录大小（字节）
   */
  private static async calculateDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)

        if (entry.isDirectory()) {
          totalSize += await this.calculateDirectorySize(fullPath)
        } else {
          const stat = await fs.stat(fullPath)
          totalSize += stat.size
        }
      }
    } catch {
      // 忽略错误
    }

    return totalSize
  }

  /**
   * 计算文件哈希（用于冲突检测）
   * @param filePath 文件路径
   * @returns 文件哈希值
   */
  static async calculateFileHash(filePath: string): Promise<string> {
    const crypto = await import('crypto')
    const fileBuffer = await fs.readFile(filePath)
    return crypto.createHash('md5').update(fileBuffer).digest('hex')
  }
}

