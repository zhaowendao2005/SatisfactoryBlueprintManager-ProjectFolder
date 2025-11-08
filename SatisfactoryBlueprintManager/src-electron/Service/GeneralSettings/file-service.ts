/**
 * 通用设置文件服务（Electron 主进程）
 * 负责通用设置配置文件的读写操作
 */
import { promises as fs } from 'fs'
import path from 'path'
import { app } from 'electron'
import type { GeneralSettingsConfig } from '../../../public/types/general-settings'

const SETTINGS_FILE_NAME = 'general-settings.json'

/**
 * 获取通用设置文件路径
 */
function getSettingsFilePath(): string {
  const userData = app.getPath('userData')
  return path.join(userData, 'Data', SETTINGS_FILE_NAME)
}

/**
 * 确保数据目录存在
 */
async function ensureDataDir(): Promise<void> {
  const userData = app.getPath('userData')
  const dataDir = path.join(userData, 'Data')
  try {
    await fs.access(dataDir)
  } catch {
    await fs.mkdir(dataDir, { recursive: true })
  }
}

/**
 * 通用设置文件服务类
 */
export class GeneralSettingsFileService {
  /**
   * 加载通用设置
   */
  async loadSettings(): Promise<GeneralSettingsConfig> {
    const filePath = getSettingsFilePath()
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const config = JSON.parse(content) as GeneralSettingsConfig
      console.log('[GeneralSettingsFileService] 加载通用设置:', config)
      return config
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('[GeneralSettingsFileService] 通用设置文件不存在，返回默认配置')
        // 返回默认配置
        return {
          closeWindowBehavior: 'minimize-to-tray',
          quickAccessShortcut: 'CommandOrControl+Shift+Q',
          quickAccessAlwaysOnTop: true,
          quickAccessAutoHideAfterUse: true,
          quickAccessRecentBlueprintsCount: 10,
          quickAccessWindowSize: {
            width: 500,
            height: 700,
          },
        }
      }
      console.error('[GeneralSettingsFileService] 加载通用设置失败:', error)
      throw error
    }
  }

  /**
   * 保存通用设置
   */
  async saveSettings(config: GeneralSettingsConfig): Promise<void> {
    await ensureDataDir()
    const filePath = getSettingsFilePath()
    const content = JSON.stringify(config, null, 2)
    await fs.writeFile(filePath, content, 'utf-8')
    console.log('[GeneralSettingsFileService] 保存通用设置:', config)
  }
}

export const generalSettingsFileService = new GeneralSettingsFileService()

