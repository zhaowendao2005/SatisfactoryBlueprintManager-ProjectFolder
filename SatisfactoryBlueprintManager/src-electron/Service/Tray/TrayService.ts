/**
 * 托盘服务（Electron 主进程）
 * 负责系统托盘的创建和管理
 */
import { Tray, Menu, BrowserWindow, nativeImage, app } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

class TrayService {
  private tray: Tray | null = null
  private mainWindow: BrowserWindow | null = null

  /**
   * 创建托盘
   */
  createTray(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow

    // 托盘图标路径（优先使用 icons 目录下的图标，如果没有则使用 favicon.ico）
    let iconPath: string
    if (process.env.DEV) {
      // 开发环境：使用项目根目录的 public 文件夹
      iconPath = path.resolve(currentDir, '../../../public/icons/favicon-16x16.png')
    } else {
      // 生产环境：使用应用资源目录
      iconPath = path.join(app.getAppPath(), 'public', 'icons', 'favicon-16x16.png')
    }
    
    try {
      let icon = nativeImage.createFromPath(iconPath)
      
      // 如果图标加载失败，尝试使用 favicon.ico
      if (icon.isEmpty()) {
        const fallbackPath = process.env.DEV
          ? path.resolve(currentDir, '../../../public/favicon.ico')
          : path.join(app.getAppPath(), 'public', 'favicon.ico')
        icon = nativeImage.createFromPath(fallbackPath)
      }
      
      // 如果还是失败，创建一个简单的默认图标
      if (icon.isEmpty()) {
        console.warn('[TrayService] 无法加载托盘图标，使用默认图标')
        // 创建一个简单的默认图标（16x16 白色方块）
        icon = nativeImage.createEmpty()
      } else {
        // 确保图标大小为 16x16（Windows 推荐）
        if (icon.getSize().width !== 16 || icon.getSize().height !== 16) {
          icon = icon.resize({ width: 16, height: 16 })
        }
      }
      
      this.tray = new Tray(icon)

      // 设置托盘提示
      this.tray.setToolTip('Satisfactory Blueprint Manager')

      // 设置托盘菜单
      this.updateContextMenu()

      // 托盘双击事件
      this.tray.on('double-click', () => {
        this.showWindow()
      })

      console.log('[TrayService] 托盘创建成功')
    } catch (error) {
      console.error('[TrayService] 创建托盘失败:', error)
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
        label: '退出程序',
        click: () => {
          // 强制退出，不触发关闭行为检查
          app.exit(0)
        },
      },
    ])

    this.tray.setContextMenu(contextMenu)
  }

  /**
   * 显示窗口
   */
  showWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore()
      }
      this.mainWindow.show()
      this.mainWindow.focus()
    }
  }

  /**
   * 隐藏窗口
   */
  hideWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.hide()
    }
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
  }
}

export const trayService = new TrayService()
