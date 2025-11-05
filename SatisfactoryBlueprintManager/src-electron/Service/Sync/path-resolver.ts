/**
 * 路径解析器服务
 * 职责：路径规范化，获取默认路径
 */
import path from 'path'
import os from 'os'
import { app } from 'electron'

/**
 * 路径解析器
 */
export class PathResolver {
  /**
   * 规范化路径（统一为正斜杠）
   * @param filePath 任意格式路径
   * @returns 规范化路径（正斜杠，无尾部斜杠）
   */
  static normalizePath(filePath: string): string {
    return path.normalize(filePath).replace(/\\/g, '/').replace(/\/$/, '')
  }

  /**
   * 获取默认存档路径
   * Windows: C:\Users\{username}\AppData\Local\FactoryGame\Saved\SaveGames\blueprints
   * @returns 默认存档路径（实际路径）
   */
  static getDefaultSaveGamePath(): string {
    let localAppDataPath: string
    if (process.platform === 'win32') {
      // Windows: 使用用户主目录拼接 AppData\Local，不使用环境变量
      const homeDir = os.homedir()
      localAppDataPath = path.join(homeDir, 'AppData', 'Local')
    } else {
      // macOS/Linux: 使用 Electron 的 appData
      localAppDataPath = app.getPath('appData')
    }
    return this.normalizePath(
      path.join(localAppDataPath, 'FactoryGame', 'Saved', 'SaveGames', 'blueprints')
    )
  }

  /**
   * 获取默认蓝图库路径
   * @returns 默认蓝图库路径（实际路径）
   */
  static getDefaultLibraryPath(): string {
    const userData = app.getPath('userData')
    return this.normalizePath(path.join(userData, 'Data', 'DefaultBlueprintRepository'))
  }

  /**
   * 获取默认备份路径
   * @returns 默认备份路径（实际路径）
   */
  static getDefaultBackupPath(): string {
    const userData = app.getPath('userData')
    return this.normalizePath(path.join(userData, 'Data', 'BlueprintBackup'))
  }
}

