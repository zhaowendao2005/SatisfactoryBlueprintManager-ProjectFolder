/**
 * 自动化执行器服务
 * @注意事项 单例模式，同一时间仅允许一个测试任务
 */
import robot from 'robotjs'
import type { ManualConfigParams } from '../../../public/types/automation-config'
import type { AutomationTestResult } from '../../../public/types/automation-config'

/**
 * 延迟函数（robotjs 不提供内置 sleep）
 */
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 配置验证错误
 */
class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * 执行超时错误
 */
class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * 自动化执行器
 */
export class AutomationExecutor {
  private isExecuting = false
  private currentTaskAbortController: AbortController | null = null

  /**
   * 执行测试任务
   * @param testText 测试文本
   * @param config 手动配置参数
   * @returns 执行结果
   * @throws ValidationError（配置无效）、TimeoutError（超时）
   */
  async execute(testText: string, config: ManualConfigParams): Promise<AutomationTestResult> {
    if (this.isExecuting) {
      throw new Error('已有任务正在执行中，请等待完成')
    }

    // 验证配置
    this.validateConfig(config)

    // 验证测试文本
    if (!testText || testText.trim().length === 0) {
      throw new ValidationError('请输入测试文本')
    }

    this.isExecuting = true
    this.currentTaskAbortController = new AbortController()
    const startTime = Date.now()

    try {
      // 超时控制：30秒
      const timeoutPromise = new Promise<AutomationTestResult>((_, reject) => {
        setTimeout(() => {
          reject(new TimeoutError('执行超时（30秒）'))
        }, 30000)
      })

      const executePromise = this.executeInternal(testText, config, this.currentTaskAbortController.signal)

      const result = await Promise.race([executePromise, timeoutPromise])
      const duration = Date.now() - startTime

      return {
        success: true,
        message: '自动化测试执行成功',
        duration,
      }
    } catch (error) {
      const duration = Date.now() - startTime
      
      if (error instanceof ValidationError) {
        throw error
      }
      
      if (error instanceof TimeoutError) {
        throw error
      }

      // 包装其他错误
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        message: `执行失败: ${this.translateError(errorMessage)}`,
        duration,
      }
    } finally {
      this.isExecuting = false
      this.currentTaskAbortController = null
    }
  }

  /**
   * 内部执行逻辑
   */
  private async executeInternal(
    testText: string,
    config: ManualConfigParams,
    signal: AbortSignal
  ): Promise<void> {
    // 检查是否已取消
    if (signal.aborted) {
      throw new Error('任务已取消')
    }

    // 1. 点击输入栏
    robot.moveMouse(config.inputFieldPosition.x, config.inputFieldPosition.y)
    await sleep(100)
    robot.mouseClick('left')

    // 检查是否已取消
    if (signal.aborted) {
      throw new Error('任务已取消')
    }

    // 2. 逐字符输入
    for (const char of testText) {
      if (signal.aborted) {
        throw new Error('任务已取消')
      }

      robot.typeString(char)
      await sleep(config.charInputDelay)
    }

    // 检查是否已取消
    if (signal.aborted) {
      throw new Error('任务已取消')
    }

    // 3. 点击第一蓝图位置
    robot.moveMouse(config.firstBlueprintPosition.x, config.firstBlueprintPosition.y)
    await sleep(100)
    robot.mouseClick('left')
  }

  /**
   * 验证配置有效性
   */
  private validateConfig(config: ManualConfigParams): void {
    if (config.inputFieldPosition.x === 0 && config.inputFieldPosition.y === 0) {
      throw new ValidationError('请先配置输入栏坐标')
    }

    if (config.firstBlueprintPosition.x === 0 && config.firstBlueprintPosition.y === 0) {
      throw new ValidationError('请先配置第一蓝图位置坐标')
    }

    if (config.charInputDelay < 10 || config.charInputDelay > 1000) {
      throw new ValidationError('字符输入速度必须在 10ms - 1000ms 之间')
    }
  }

  /**
   * 翻译错误信息为用户友好的中文提示
   */
  private translateError(errorMessage: string): string {
    const lowerMessage = errorMessage.toLowerCase()

    if (lowerMessage.includes('permission') || lowerMessage.includes('access denied')) {
      return '权限不足，请检查应用是否有鼠标键盘控制权限'
    }

    if (lowerMessage.includes('timeout')) {
      return '操作超时，请检查坐标是否正确'
    }

    if (lowerMessage.includes('invalid') || lowerMessage.includes('invalid position')) {
      return '坐标无效，请重新标定'
    }

    return errorMessage
  }

  /**
   * 停止当前执行的任务
   */
  stop(): void {
    if (this.currentTaskAbortController) {
      this.currentTaskAbortController.abort()
    }
  }

  /**
   * 获取当前执行状态
   */
  getIsExecuting(): boolean {
    return this.isExecuting
  }
}

// 导出单例
export const automationExecutor = new AutomationExecutor()

