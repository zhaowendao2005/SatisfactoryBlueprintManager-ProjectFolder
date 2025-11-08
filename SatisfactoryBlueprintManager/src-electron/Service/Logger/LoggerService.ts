/**
 * 日志服务
 * 功能：
 * 1. 拦截所有 console 输出
 * 2. 写入到用户数据目录的 logs 目录
 * 3. 按日期分割日志文件
 * 4. 自动清理旧日志文件
 */

import { app } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: unknown
}

class LoggerService {
  private logDir: string | null = null
  private currentLogFile: string | null = null
  private currentDate: string = ''
  private writeStream: fs.FileHandle | null = null
  private originalConsole: {
    log: typeof console.log
    info: typeof console.info
    warn: typeof console.warn
    error: typeof console.error
    debug: typeof console.debug
  } | null = null
  private isInitialized = false
  private maxLogFiles = 30 // 保留最近30天的日志
  private maxFileSize = 10 * 1024 * 1024 // 10MB，单个日志文件最大大小

  /**
   * 初始化日志服务
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // 获取用户数据目录
      const userData = app.getPath('userData')
      this.logDir = path.join(userData, 'logs')

      // 确保日志目录存在
      if (!existsSync(this.logDir)) {
        await fs.mkdir(this.logDir, { recursive: true })
      }

      // 保存原始 console 方法
      this.originalConsole = {
        log: console.log.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        debug: console.debug.bind(console)
      }

      // 拦截 console 输出
      this.interceptConsole()

      // 初始化当前日志文件
      await this.ensureLogFile()

      // 清理旧日志文件
      await this.cleanOldLogs()

      this.isInitialized = true
      
      // 使用原始 console 记录初始化成功消息（避免在初始化过程中触发日志写入）
      if (this.originalConsole) {
        this.originalConsole.log('[LoggerService] 初始化成功，日志目录:', this.logDir)
      }
      
      // 初始化完成后，写入一条日志记录（此时 isInitialized 已为 true）
      try {
        const timestamp = new Date().toISOString()
        const logEntry: LogEntry = {
          timestamp,
          level: 'info',
          message: 'LoggerService 初始化成功',
          data: { logDir: this.logDir }
        }
        const logLine = this.formatLogLine(logEntry)
        const buffer = Buffer.from(logLine + '\n', 'utf-8')
        if (this.writeStream) {
          await this.writeStream.write(buffer)
        }
      } catch (error) {
        // 忽略初始化日志写入失败
      }
    } catch (error) {
      // 如果初始化失败，至少保留原始 console
      if (this.originalConsole) {
        this.originalConsole.error('[LoggerService] 初始化失败:', error)
      } else {
        console.error('[LoggerService] 初始化失败:', error)
      }
    }
  }

  /**
   * 拦截 console 输出
   */
  private interceptConsole(): void {
    if (!this.originalConsole) {
      return
    }

    // 拦截 console.log
    console.log = (...args: unknown[]) => {
      this.originalConsole!.log(...args)
      this.writeLog('log', this.formatMessage(args), { args })
    }

    // 拦截 console.info
    console.info = (...args: unknown[]) => {
      this.originalConsole!.info(...args)
      this.writeLog('info', this.formatMessage(args), { args })
    }

    // 拦截 console.warn
    console.warn = (...args: unknown[]) => {
      this.originalConsole!.warn(...args)
      this.writeLog('warn', this.formatMessage(args), { args })
    }

    // 拦截 console.error
    console.error = (...args: unknown[]) => {
      this.originalConsole!.error(...args)
      this.writeLog('error', this.formatMessage(args), { args })
    }

    // 拦截 console.debug
    console.debug = (...args: unknown[]) => {
      this.originalConsole!.debug(...args)
      this.writeLog('debug', this.formatMessage(args), { args })
    }
  }

  /**
   * 格式化消息
   */
  private formatMessage(args: unknown[]): string {
    return args
      .map((arg) => {
        if (typeof arg === 'string') {
          return arg
        }
        if (arg instanceof Error) {
          return `${arg.message}\n${arg.stack || ''}`
        }
        try {
          return JSON.stringify(arg, null, 2)
        } catch {
          return String(arg)
        }
      })
      .join(' ')
  }

  /**
   * 确保日志文件存在且是当天的
   */
  private async ensureLogFile(): Promise<void> {
    if (!this.logDir) {
      return
    }

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    // 如果日期变了，关闭旧文件
    if (this.currentDate !== today && this.writeStream) {
      await this.writeStream.close()
      this.writeStream = null
    }

    // 如果文件不存在或日期变了，创建新文件
    if (!this.writeStream || this.currentDate !== today) {
      this.currentDate = today
      this.currentLogFile = path.join(this.logDir, `app-${today}.log`)

      // 检查文件大小，如果超过限制，创建新文件
      if (existsSync(this.currentLogFile)) {
        const stats = await fs.stat(this.currentLogFile)
        if (stats.size > this.maxFileSize) {
          // 文件太大，重命名为带时间戳的文件
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const oldFile = path.join(this.logDir, `app-${today}-${timestamp}.log`)
          await fs.rename(this.currentLogFile, oldFile)
        }
      }

      // 打开文件（追加模式）
      this.writeStream = await fs.open(this.currentLogFile, 'a')
    }
  }

  /**
   * 写入日志（内部方法，不使用 console，避免递归）
   */
  private async writeLog(level: LogLevel, message: string, data?: unknown): Promise<void> {
    if (!this.logDir || !this.isInitialized) {
      return
    }

    try {
      // 确保日志文件是最新的
      await this.ensureLogFile()

      if (!this.writeStream) {
        return
      }

      const timestamp = new Date().toISOString()
      const logEntry: LogEntry = {
        timestamp,
        level,
        message,
        data
      }

      // 格式化日志行
      const logLine = this.formatLogLine(logEntry)

      // 写入文件（使用原始文件句柄写入，避免触发 console 拦截）
      const buffer = Buffer.from(logLine + '\n', 'utf-8')
      await this.writeStream.write(buffer)
    } catch (error) {
      // 如果写入失败，尝试使用原始 console（但只在初始化完成后）
      if (this.originalConsole && this.isInitialized) {
        // 使用原始 console，避免递归
        try {
          this.originalConsole.error('[LoggerService] 写入日志失败:', error)
        } catch {
          // 如果连原始 console 都失败，忽略错误
        }
      }
    }
  }

  /**
   * 格式化日志行
   */
  private formatLogLine(entry: LogEntry): string {
    const levelStr = entry.level.toUpperCase().padEnd(5)
    const timeStr = entry.timestamp.replace('T', ' ').replace('Z', '')
    
    let line = `[${timeStr}] [${levelStr}] ${entry.message}`
    
    if (entry.data) {
      try {
        const dataStr = typeof entry.data === 'string' 
          ? entry.data 
          : JSON.stringify(entry.data, null, 2)
        line += `\n${dataStr}`
      } catch {
        line += `\n${String(entry.data)}`
      }
    }
    
    return line
  }

  /**
   * 清理旧日志文件
   */
  private async cleanOldLogs(): Promise<void> {
    if (!this.logDir) {
      return
    }

    try {
      const files = await fs.readdir(this.logDir)
      const logFiles = files.filter((file) => file.startsWith('app-') && file.endsWith('.log'))

      if (logFiles.length <= this.maxLogFiles) {
        return
      }

      // 按文件名排序（文件名包含日期）
      logFiles.sort()

      // 删除最旧的文件
      const filesToDelete = logFiles.slice(0, logFiles.length - this.maxLogFiles)
      
      for (const file of filesToDelete) {
        const filePath = path.join(this.logDir, file)
        try {
          await fs.unlink(filePath)
          // 使用原始 console 记录，避免在清理过程中触发日志写入
          if (this.originalConsole && this.isInitialized) {
            this.originalConsole.log(`[LoggerService] 已删除旧日志文件: ${file}`)
          }
        } catch (error) {
          if (this.originalConsole && this.isInitialized) {
            this.originalConsole.error(`[LoggerService] 删除旧日志文件失败: ${file}`, error)
          }
        }
      }
    } catch (error) {
      if (this.originalConsole) {
        this.originalConsole.error('[LoggerService] 清理旧日志失败:', error)
      }
    }
  }

  /**
   * 获取日志目录路径
   */
  getLogDir(): string | null {
    return this.logDir
  }

  /**
   * 关闭日志服务
   */
  async close(): Promise<void> {
    if (this.writeStream) {
      await this.writeStream.close()
      this.writeStream = null
    }
    this.isInitialized = false
  }
}

// 单例
export const loggerService = new LoggerService()

