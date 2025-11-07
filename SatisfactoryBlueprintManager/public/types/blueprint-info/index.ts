/**
 * 蓝图信息相关类型定义
 * 用于跨 Frontend 和 src-electron 的类型共享
 */

/**
 * 蓝图信息（从 .sbpcfg 解析的完整数据）
 * @注意事项 包含库解析的完整 blueprint 对象
 */
export interface BlueprintInfo {
  blueprintId: string          // 蓝图唯一标识（来自配置）
  parsedAt: number            // 解析时间戳
  fileSize: {                 // 文件大小
    sbp: number               // .sbp 文件大小（字节）
    sbpcfg: number            // .sbpcfg 文件大小（字节）
  }
  blueprint: Record<string, unknown>  // 完整的蓝图对象（库解析的原始数据）
}

/**
 * 解析进度信息
 */
export interface ParseProgressInfo {
  total: number                // 总任务数
  completed: number            // 已完成数（成功+失败）
  succeeded: number            // 成功数
  failed: number               // 失败数
  currentBlueprintName: string // 当前正在解析的蓝图名称
  percentage: number           // 进度百分比 [0, 100]
  estimatedTimeLeft: number    // 预计剩余时间（秒）
}

/**
 * 解析任务的最终结果
 */
export interface ParseResult {
  succeeded: string[]          // 成功解析的 blueprintId 列表
  failed: Array<{              // 失败的任务详情
    blueprintId: string
    blueprintName: string
    error: string              // 错误信息
  }>
  totalTime: number            // 总耗时（毫秒）
}

/**
 * 蓝图路径信息（输入）
 */
export interface BlueprintPathInfo {
  id: string                   // blueprintId（配置中的 id）
  name: string                 // 蓝图名称（用于进度显示）
  path: string                 // 完整文件路径（.sbp 或 .sbpcfg）
}

/**
 * 蓝图信息索引文件结构
 */
export interface BlueprintInfoIndex {
  blueprintIds: string[]       // 已解析的蓝图 ID 列表
  updatedAt: number            // 最后更新时间戳
}

