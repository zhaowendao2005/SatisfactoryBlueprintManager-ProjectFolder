/**
 * Python 自动化服务管理器
 * 负责启动、管理和停止 Python Flask 后端服务
 * @注意事项 单例模式，应用生命周期内仅启动一次
 */
import { spawn, type ChildProcess } from 'child_process'
import { app } from 'electron'
import path from 'path'
import { existsSync } from 'fs'
import axios, { type AxiosInstance } from 'axios'

/**
 * 服务状态枚举
 */
enum ServiceStatus {
  INITIAL = 'initial',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error'
}

/**
 * 自动化请求接口
 */
export interface AutomationRequest {
  action: 'moveMouse' | 'mouseClick' | 'typeText'
  params: Record<string, unknown>
}

/**
 * 自动化响应接口
 */
export interface AutomationResponse {
  success: boolean
  message: string
  duration?: number
}

/**
 * Python 服务管理器
 */
export class PythonServiceManager {
  private static instance: PythonServiceManager | null = null
  private process: ChildProcess | null = null
  private status: ServiceStatus = ServiceStatus.INITIAL
  private httpClient: AxiosInstance
  private readonly baseURL = 'http://localhost:58888'
  private readonly exeName = 'automation-service.exe'
  
  private constructor() {
    // 创建 HTTP 客户端
    this.httpClient = axios.create({
      baseURL: this.baseURL,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
  
  /**
   * 获取单例实例
   */
  static getInstance(): PythonServiceManager {
    if (!PythonServiceManager.instance) {
      PythonServiceManager.instance = new PythonServiceManager()
    }
    return PythonServiceManager.instance
  }
  
  /**
   * 启动 Python 服务
   */
  async start(): Promise<void> {
    if (this.status === ServiceStatus.RUNNING) {
      console.log('[PythonService] 服务已在运行中')
      return
    }
    
    if (this.status === ServiceStatus.STARTING) {
      throw new Error('服务正在启动中，请稍候')
    }
    
    this.status = ServiceStatus.STARTING
    console.log('[PythonService] 启动服务...')
    
    try {
      // 1. 确定 exe 路径
      const exePath = this.getExePath()
      console.log(`[PythonService] exe 路径: ${exePath}`)
      
      // 2. 检查文件是否存在
      if (!existsSync(exePath)) {
        throw new Error(`自动化服务文件不存在: ${exePath}\n请先运行构建脚本: npm run build:python`)
      }
      
      // 3. 启动进程
      this.process = spawn(exePath, [], {
        cwd: path.dirname(exePath),
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe']
      })
      
      // 4. 监听进程事件
      this.setupProcessListeners()
      
      // 5. 等待服务就绪（健康检查）
      await this.waitForServiceReady()
      
      this.status = ServiceStatus.RUNNING
      console.log('[PythonService] 服务启动成功')
      
    } catch (error) {
      this.status = ServiceStatus.ERROR
      console.error('[PythonService] 启动失败:', error)
      
      // 清理进程
      if (this.process) {
        this.process.kill()
        this.process = null
      }
      
      throw error
    }
  }
  
  /**
   * 执行自动化操作
   */
  async execute(request: AutomationRequest): Promise<AutomationResponse> {
    if (this.status !== ServiceStatus.RUNNING) {
      throw new Error(`服务未运行，当前状态: ${this.status}`)
    }
    
    try {
      const response = await this.httpClient.post<AutomationResponse>('/api/execute', request)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('无法连接到自动化服务，请重启应用')
        }
        if (error.response) {
          throw new Error(error.response.data.message || '服务器错误')
        }
      }
      throw error
    }
  }
  
  /**
   * 停止服务
   */
  async stop(): Promise<void> {
    if (this.status === ServiceStatus.STOPPED || this.status === ServiceStatus.INITIAL) {
      console.log('[PythonService] 服务未运行')
      return
    }
    
    this.status = ServiceStatus.STOPPING
    console.log('[PythonService] 停止服务...')
    
    if (this.process) {
      // 检查进程是否还在运行
      if (this.process.killed || this.process.exitCode !== null) {
        console.log('[PythonService] 进程已退出')
        this.process = null
        this.status = ServiceStatus.STOPPED
        return
      }
      
      try {
        // Windows 上使用不带参数的 kill()，其他平台使用 SIGTERM
        const isWindows = process.platform === 'win32'
        
        if (isWindows) {
          // Windows: 直接终止进程
          this.process.kill()
        } else {
          // Unix: 先尝试优雅关闭
          this.process.kill('SIGTERM')
        }
        
        // 等待最多 5 秒
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            if (this.process && !this.process.killed && this.process.exitCode === null) {
              console.log('[PythonService] 优雅关闭超时，强制终止')
              try {
                if (isWindows) {
                  this.process.kill()
                } else {
                  this.process.kill('SIGKILL')
                }
              } catch (error) {
                console.error('[PythonService] 强制终止失败:', error)
              }
            }
            resolve()
          }, 5000)
          
          this.process?.once('exit', () => {
            clearTimeout(timeout)
            resolve()
          })
        })
      } catch (error) {
        console.error('[PythonService] 停止进程时出错:', error)
      } finally {
        this.process = null
      }
    }
    
    this.status = ServiceStatus.STOPPED
    console.log('[PythonService] 服务已停止')
  }
  
  /**
   * 获取服务状态
   */
  isRunning(): boolean {
    return this.status === ServiceStatus.RUNNING
  }
  
  /**
   * 获取当前状态
   */
  getStatus(): ServiceStatus {
    return this.status
  }
  
  /**
   * 获取 exe 路径
   */
  private getExePath(): string {
    if (app.isPackaged) {
      // 生产环境：resources 目录下
      return path.join(process.resourcesPath, 'automation-service', this.exeName)
    } else {
      // 开发环境：从 .quasar/dev-electron 向上两级到源码根目录，然后访问 public
      return path.join(app.getAppPath(), '..', '..', 'public', 'automation-service', this.exeName)
    }
  }
  
  /**
   * 设置进程监听器
   */
  private setupProcessListeners(): void {
    if (!this.process) return
    
    // 标准输出
    this.process.stdout?.on('data', (data) => {
      console.log(`[PythonService] ${data.toString().trim()}`)
    })
    
    // 错误输出
    this.process.stderr?.on('data', (data) => {
      console.error(`[PythonService ERROR] ${data.toString().trim()}`)
    })
    
    // 进程退出
    this.process.on('exit', (code, signal) => {
      console.log(`[PythonService] 进程退出: code=${code}, signal=${signal}`)
      
      if (this.status === ServiceStatus.RUNNING) {
        // 非预期退出
        console.error('[PythonService] 进程异常退出')
        this.status = ServiceStatus.ERROR
      }
      
      this.process = null
    })
    
    // 进程错误
    this.process.on('error', (error) => {
      console.error('[PythonService] 进程错误:', error)
      this.status = ServiceStatus.ERROR
    })
  }
  
  /**
   * 等待服务就绪（健康检查）
   */
  private async waitForServiceReady(): Promise<void> {
    const maxWaitTime = 10000 // 最多等待 10 秒
    const startTime = Date.now()
    let delay = 100 // 初始延迟 100ms
    
    console.log('[PythonService] 等待服务就绪...')
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await this.httpClient.get('/health', { timeout: 1000 })
        if (response.data.status === 'ok') {
          console.log(`[PythonService] 健康检查通过 (版本: ${response.data.version})`)
          return
        }
      } catch (error) {
        // 继续等待
      }
      
      // 指数退避
      await new Promise(resolve => setTimeout(resolve, delay))
      delay = Math.min(delay * 2, 1600) // 最大延迟 1.6 秒
    }
    
    throw new Error('服务启动超时（10秒内未响应健康检查）')
  }
}

// 导出单例获取函数
export const pythonServiceManager = PythonServiceManager.getInstance()

