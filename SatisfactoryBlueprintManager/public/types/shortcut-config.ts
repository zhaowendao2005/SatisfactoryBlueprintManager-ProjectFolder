/**
 * 快捷键配置相关类型定义
 */

/**
 * 快捷键配置
 * @注意事项 使用Electron快捷键格式，如 "CommandOrControl+Shift+B"
 */
export interface ShortcutConfig {
  toggleWindow: string    // 唤出/隐藏窗口快捷键，默认 "CommandOrControl+Shift+B"
}

