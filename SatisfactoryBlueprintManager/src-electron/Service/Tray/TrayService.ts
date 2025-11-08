/**
 * 托盘服务（Electron 主进程）
 * 负责系统托盘的创建和管理
 */
import { Tray, Menu, nativeImage, app } from 'electron'
import type { BrowserWindow } from 'electron'
import path from 'path'
import { existsSync } from 'fs'
import { quickAccessWindowService } from '../QuickAccess/QuickAccessWindowService'

class TrayService {
  private tray: Tray | null = null
  private mainWindow: BrowserWindow | null = null

  /**
   * 创建托盘
   */
  createTray(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow

    // 托盘图标路径配置
    // Windows 平台建议使用 ICO 图标获取最佳视觉效果
    // 注意：Quasar 使用 ES Module，不能使用 __dirname
    // 开发环境：app.getAppPath() 返回 .quasar/dev-electron，需要回溯到项目根
    // 生产环境：app.getAppPath() 返回应用根目录，Quasar 会将 src-electron 内容复制到根目录
    const appPath = app.getAppPath()
    const isDev = process.env.DEV === 'true' || !app.isPackaged
    
    // 主图标路径：src-electron/icons/icon.ico（Windows 推荐使用 ICO 格式）
    const iconPath = isDev
      ? path.join(appPath, '..', '..', 'src-electron', 'icons', 'icon.ico')
      : path.join(appPath, 'icons', 'icon.ico')
    
    // 备用图标路径：PNG 格式
    const fallbackIconPath = isDev
      ? path.join(appPath, '..', '..', 'src-electron', 'icons', 'icon.png')
      : path.join(appPath, 'icons', 'icon.png')
    
    // 调试：打印托盘图标路径信息
    console.log('[TrayService] ========== 托盘图标路径调试 ==========')
    console.log('[TrayService] 环境信息:')
    console.log('[TrayService]   - process.env.DEV:', process.env.DEV)
    console.log('[TrayService]   - app.isPackaged:', app.isPackaged)
    console.log('[TrayService]   - isDev:', isDev)
    console.log('[TrayService]   - app.getAppPath():', appPath)
    console.log('[TrayService] 图标路径:')
    console.log('[TrayService]   - 主图标路径 (ICO):', iconPath)
    console.log('[TrayService]   - 主图标文件存在:', existsSync(iconPath))
    console.log('[TrayService]   - 备用图标路径 (PNG):', fallbackIconPath)
    console.log('[TrayService]   - 备用图标文件存在:', existsSync(fallbackIconPath))
    console.log('[TrayService] ==========================================')
    
    try {
      let icon: Electron.NativeImage | undefined
      
      // 优先尝试加载 ICO 图标（Windows 推荐）
      if (existsSync(iconPath)) {
        console.log('[TrayService] 尝试加载主图标 (ICO):', iconPath)
        icon = nativeImage.createFromPath(iconPath)
        
        if (icon.isEmpty()) {
          console.warn('[TrayService] ICO 图标加载失败（isEmpty），尝试备用图标')
          if (existsSync(fallbackIconPath)) {
            icon = nativeImage.createFromPath(fallbackIconPath)
          }
        } else {
          const size = icon.getSize()
          console.log('[TrayService] ICO 图标加载成功，尺寸:', size.width, 'x', size.height)
        }
      } else {
        console.log('[TrayService] ICO 图标文件不存在，尝试备用图标 (PNG)')
        if (existsSync(fallbackIconPath)) {
          icon = nativeImage.createFromPath(fallbackIconPath)
          if (!icon.isEmpty()) {
            const size = icon.getSize()
            console.log('[TrayService] PNG 图标加载成功，尺寸:', size.width, 'x', size.height)
          }
        }
      }
      
      // 如果仍然没有加载成功，尝试使用 public 目录下的图标（最后的兜底）
      if (!icon || icon.isEmpty()) {
        console.log('[TrayService] 备用图标也加载失败，尝试 public 目录下的图标')
        const publicIconPath = isDev
          ? path.join(appPath, '..', '..', 'public', 'icons', 'favicon-16x16.png')
          : path.join(appPath, 'public', 'icons', 'favicon-16x16.png')
        
        console.log('[TrayService] public 图标路径:', publicIconPath)
        console.log('[TrayService] public 图标文件存在:', existsSync(publicIconPath))
        
        if (existsSync(publicIconPath)) {
          icon = nativeImage.createFromPath(publicIconPath)
          if (!icon.isEmpty()) {
            console.log('[TrayService] public 图标加载成功')
            // 确保图标大小为 16x16（Windows 推荐）
            const size = icon.getSize()
            if (size.width !== 16 || size.height !== 16) {
              console.log('[TrayService] 调整图标尺寸为 16x16')
              icon = icon.resize({ width: 16, height: 16 })
            }
          }
        }
      }
      
      // 如果所有图标都加载失败，创建一个简单的默认图标
      if (!icon || icon.isEmpty()) {
        console.warn('[TrayService] 所有图标加载失败，使用默认图标')
        // 创建一个简单的默认图标（16x16 白色方块）
        icon = nativeImage.createEmpty()
      }
      
      // 创建托盘
      this.tray = new Tray(icon)
      console.log('[TrayService] 托盘实例创建成功')

      // 设置托盘提示
      this.tray.setToolTip('Satisfactory Blueprint Manager')
      console.log('[TrayService] 托盘提示设置成功')

      // 设置托盘菜单
      this.updateContextMenu()
      console.log('[TrayService] 托盘菜单设置成功')

      // 托盘双击事件
      this.tray.on('double-click', () => {
        console.log('[TrayService] 托盘图标被双击')
        this.showWindow()
      })

      console.log('[TrayService] ========== 托盘创建完成 ==========')
    } catch (error) {
      console.error('[TrayService] 创建托盘失败:', error)
      if (error instanceof Error) {
        console.error('[TrayService] 错误详情:', error.message)
        console.error('[TrayService] 错误堆栈:', error.stack)
      }
    }
  }

  /**
   * 更新托盘菜单
   */
  private updateContextMenu(): void {
    if (!this.tray) return

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示窗口',
        click: () => {
          this.showWindow()
        },
      },
      {
        label: '隐藏窗口',
        click: () => {
          this.hideWindow()
        },
      },
      {
        type: 'separator',
      },
      {
        label: '快速访问',
        click: () => {
          quickAccessWindowService.toggle()
        },
      },
      {
        type: 'separator',
      },
      {
        label: '退出程序',
        click: () => {
          // 从托盘菜单退出时，应该强制关闭所有窗口并退出
          console.log('[TrayService] 用户点击退出程序，开始清理...')
          
          // 1. 销毁主窗口（绕过 close 事件的阻止）
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.removeAllListeners('close')
            this.mainWindow.destroy()
            console.log('[TrayService] 主窗口已销毁')
          }
          
          // 2. 销毁快速访问窗口（关键：避免其 close 监听器阻止 app.quit）
          quickAccessWindowService.destroy()
          console.log('[TrayService] 快速访问窗口已销毁')
          
          // 3. 现在所有窗口都已销毁，app.quit() 可以正常触发 will-quit
          console.log('[TrayService] 调用 app.quit()')
          app.quit()
        },
      },
    ])

    this.tray.setContextMenu(contextMenu)
  }

  /**
   * 显示窗口
   */
  showWindow(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore()
      }
      this.mainWindow.show()
      this.mainWindow.focus()
    } else {
      console.error('[TrayService] 主窗口不可用或已被销毁，无法显示')
    }
  }

  /**
   * 隐藏窗口
   */
  hideWindow(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.hide()
    } else {
      console.error('[TrayService] 主窗口不可用或已被销毁，无法隐藏')
    }
  }

  /**
   * 更新主窗口引用
   */
  updateMainWindow(mainWindow: BrowserWindow | null): void {
    this.mainWindow = mainWindow
  }

  /**
   * 销毁托盘
   */
  destroy(): void {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
      console.log('[TrayService] 托盘已销毁')
    }
    this.mainWindow = null
  }
}

export const trayService = new TrayService()
