/**
 * 关闭窗口行为
 */
export type CloseWindowBehavior = 'minimize-to-tray' | 'quit' | 'ask'

/**
 * 通用设置配置
 */
export interface GeneralSettingsConfig {
  closeWindowBehavior: CloseWindowBehavior
}

