/**
 * 关闭窗口行为
 */
export type CloseWindowBehavior = 'minimize-to-tray' | 'quit' | 'ask'

/**
 * 通用设置配置
 */
export interface GeneralSettingsConfig {
  closeWindowBehavior: CloseWindowBehavior
  quickAccessShortcut: string                  // 快速访问快捷键，默认 'CommandOrControl+Shift+Q'
  quickAccessAlwaysOnTop: boolean               // 快速访问窗口置顶，默认true
  quickAccessAutoHideAfterUse: boolean         // 使用蓝图后自动隐藏窗口，默认true
  quickAccessRecentBlueprintsCount: number     // 最近使用蓝图记录数量，默认10，范围5-20
  quickAccessWindowSize: {                     // 窗口尺寸
    width: number
    height: number
    x?: number                                 // 窗口X坐标（可选）
    y?: number                                 // 窗口Y坐标（可选）
  }
  recentBlueprints?: Array<{                   // 最近使用的蓝图列表
    path: string
    timestamp: number
  }>
}

