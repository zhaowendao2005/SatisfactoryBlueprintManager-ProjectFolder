/**
 * 坐标标定相关类型定义
 */

/**
 * 坐标标定结果
 * @注意事项 x, y 为物理坐标（设备像素），直接用于 @nut-tree/nut-js
 * @注意事项 坐标为当前环境定制，环境变化（DPI/显示器布局）需重新标定
 */
export interface CalibrationResult {
  x: number                 // 物理 X 坐标（设备像素）
  y: number                 // 物理 Y 坐标（设备像素）
  displayIndex: number      // 显示器索引（从 0 开始，仅供参考）
  timestamp: number         // 标定时间戳
}

/**
 * 标定类型
 */
export type CalibrationType = 'inputField' | 'firstBlueprint'

