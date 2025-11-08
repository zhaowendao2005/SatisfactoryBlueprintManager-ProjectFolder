/**
 * 坐标标定服务
 * @注意事项 单例模式，同一时间仅允许一个标定流程
 */
import { app, BrowserWindow, screen, ipcMain } from 'electron'
import path from 'path'
import type { CalibrationResult, CalibrationType } from '../../../public/types/automation-config/calibration'
import { captureAllScreens } from './ScreenCapture'
import { getOverlayHTML } from './OverlayTemplate'

/**
 * 用户取消标定错误
 */
class UserCancelledError extends Error {
  constructor() {
    super('用户取消了标定')
    this.name = 'UserCancelledError'
  }
}

export class CalibrationService {
  private static instance: CalibrationService | null = null
  private isCalibrating = false
  private overlayWindows: BrowserWindow[] = []
  private calibrationResolve: ((result: CalibrationResult) => void) | null = null
  private calibrationReject: ((error: Error) => void) | null = null
  private mainWindow: BrowserWindow | null = null
  private calibrationType: CalibrationType | null = null

  /**
   * 获取单例实例
   */
  static getInstance(): CalibrationService {
    if (!CalibrationService.instance) {
      CalibrationService.instance = new CalibrationService()
    }
    return CalibrationService.instance
  }

  /**
   * 启动坐标标定流程
   * @param mainWindow - 主窗口引用（用于隐藏/恢复）
   * @param type - 标定类型（用于日志和错误提示）
   * @returns Promise<CalibrationResult> 标定结果
   * @throws Error 如果已有标定流程正在进行
   * @throws Error 如果截图捕获失败
   */
  async startCalibration(
    mainWindow: BrowserWindow,
    type: CalibrationType
  ): Promise<CalibrationResult> {
    if (this.isCalibrating) {
      throw new Error('标定流程已在进行中')
    }

    this.isCalibrating = true
    this.mainWindow = mainWindow
    this.calibrationType = type

    // 注册 IPC 监听器
    this.registerIpcHandlers()

    return new Promise<CalibrationResult>((resolve, reject) => {
      this.calibrationResolve = resolve
      this.calibrationReject = reject

      // 开始标定流程
      this.executeCalibration().catch((error) => {
        this.cleanup(mainWindow)
        reject(error)
      })
    })
  }

  /**
   * 执行标定流程
   */
  private async executeCalibration(): Promise<void> {
    if (!this.mainWindow) {
      throw new Error('主窗口引用丢失')
    }

    try {
      // 步骤 1：捕获所有显示器截图
      const screenshotMap = await captureAllScreens()
      const displays = screen.getAllDisplays()

      if (displays.length === 0) {
        throw new Error('未检测到显示器')
      }

      // 步骤 2：隐藏主窗口
      this.mainWindow.hide()

      // 等待主窗口完全隐藏
      await new Promise((resolve) => setTimeout(resolve, 200))

      // 步骤 3：为每个显示器创建叠加窗口
      for (let i = 0; i < displays.length; i++) {
        const display = displays[i]
        const displayId = String(display.id)
        const screenshotDataURL = screenshotMap.get(displayId)

        if (screenshotDataURL) {
          const overlayWindow = await this.createOverlayWindow(display, screenshotDataURL)
          this.overlayWindows.push(overlayWindow)
        }
      }

      if (this.overlayWindows.length === 0) {
        throw new Error('无法创建叠加窗口')
      }
    } catch (error) {
      this.cleanup(this.mainWindow!)
      throw error
    }
  }

  /**
   * 创建叠加窗口
   */
  private async createOverlayWindow(
    display: Electron.Display,
    screenshotDataURL: string
  ): Promise<BrowserWindow> {
    const overlayWindow = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      fullscreen: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        // 开发环境：Quasar 已设置正确的绝对路径，直接 resolve
        // 生产环境：从 app.asar 加载
        preload: process.env.DEV
          ? path.resolve(
              process.env.QUASAR_ELECTRON_PRELOAD_FOLDER || '',
          'overlay' + (process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION || '.cjs')
            )
          : path.join(app.getAppPath(), 'Preload', 'overlay.cjs'),
      },
    })

    // 加载 HTML（使用 data URL，不需要处理文件路径）
    const htmlContent = getOverlayHTML()
    await overlayWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)

    // 等待窗口就绪后发送截图数据
    overlayWindow.webContents.once('did-finish-load', () => {
      overlayWindow.webContents.send('set-screenshot', screenshotDataURL)
    })

    // 存储显示器 ID 到窗口对象（用于后续坐标计算）
    ;(overlayWindow as any).displayId = String(display.id)
    ;(overlayWindow as any).displayIndex = screen.getAllDisplays().findIndex(
      (d) => String(d.id) === String(display.id)
    )
    ;(overlayWindow as any).display = display

    return overlayWindow
  }

  /**
   * 注册 IPC 处理器
   */
  private registerIpcHandlers(): void {
    // 处理叠加窗口的点击事件
    ipcMain.on('calibration:click', (event, clickX: number, clickY: number) => {
      this.handleOverlayClick(event, clickX, clickY)
    })

    // 处理取消事件
    ipcMain.on('calibration:cancel', () => {
      this.cancelCalibration()
    })
  }

  /**
   * 移除 IPC 处理器
   */
  private unregisterIpcHandlers(): void {
    ipcMain.removeAllListeners('calibration:click')
    ipcMain.removeAllListeners('calibration:cancel')
  }

  /**
   * 处理叠加窗口的点击事件
   */
  private handleOverlayClick(
    event: Electron.IpcMainEvent,
    clickX: number,
    clickY: number
  ): void {
    // 找到点击的窗口
    const overlayWindow = BrowserWindow.fromWebContents(event.sender)
    if (!overlayWindow) {
      return
    }

    const display = (overlayWindow as any).display as Electron.Display
    const displayIndex = (overlayWindow as any).displayIndex as number

    if (!display) {
      console.error('无法获取显示器信息')
      return
    }

    // 步骤 1：计算逻辑坐标（CSS 像素，相对于主显示器左上角）
    const logicalX = clickX + display.bounds.x
    const logicalY = clickY + display.bounds.y

    // 步骤 2：转换为物理坐标（设备像素，用于 nut-js）
    const physicalX = Math.round(logicalX * display.scaleFactor)
    const physicalY = Math.round(logicalY * display.scaleFactor)

    // 步骤 3：创建标定结果
    const result: CalibrationResult = {
      x: physicalX,
      y: physicalY,
      displayIndex,
      timestamp: Date.now(),
    }

    // 完成标定
    if (this.calibrationResolve) {
      this.cleanup(this.mainWindow!)
      this.calibrationResolve(result)
      this.reset()
    }
  }

  /**
   * 取消当前标定流程
   * @注意事项 会恢复主窗口并清理叠加窗口，Promise 会 reject
   */
  cancelCalibration(): void {
    if (this.calibrationReject) {
      this.cleanup(this.mainWindow!)
      this.calibrationReject(new UserCancelledError())
      this.reset()
    }
  }

  /**
   * 清理资源（关闭叠加窗口、恢复主窗口）
   */
  private cleanup(mainWindow: BrowserWindow | null): void {
    // 关闭所有叠加窗口
    for (const window of this.overlayWindows) {
      if (!window.isDestroyed()) {
        window.close()
      }
    }
    this.overlayWindows = []

    // 恢复主窗口
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
    }

    // 移除 IPC 监听器
    this.unregisterIpcHandlers()
  }

  /**
   * 重置状态
   */
  private reset(): void {
    this.isCalibrating = false
    this.mainWindow = null
    this.calibrationType = null
    this.calibrationResolve = null
    this.calibrationReject = null
  }
}

// 导出单例
export const calibrationService = CalibrationService.getInstance()

