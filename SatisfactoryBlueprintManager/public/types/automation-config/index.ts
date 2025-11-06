/**
 * 自动化配置相关类型定义（跨层级）
 * 用于 Frontend 和 src-electron 之间的 IPC 通信
 */

/**
 * 自动化配置元信息
 * @注意事项 id 是唯一标识，格式为 {name}-{4位哈希}
 */
export interface AutomationConfigMeta {
  id: string          // 配置 ID（文件名不含扩展名）
  name: string        // 配置显示名称
  createdAt: number   // 创建时间戳
  updatedAt: number   // 更新时间戳
}

/**
 * 手动配置模式参数
 * @注意事项 坐标 (0, 0) 表示未配置，需在 UI 层提示用户定位
 */
export interface ManualConfigParams {
  inputFieldPosition: { x: number; y: number }   // 输入栏屏幕坐标
  firstBlueprintPosition: { x: number; y: number } // 第一位蓝图屏幕坐标
  charInputDelay: number                          // 字符输入间隔（ms），范围 10-1000
  displayIndex: number | null                     // 显示器序号（未来记录操作的显示器序号），默认 null
}

/**
 * 智能配置模式参数（占位，暂不实现）
 */
export interface SmartConfigParams {
  autoDetect: boolean
  confidence: number  // 识别置信度阈值
}

/**
 * 自动化配置完整数据
 * @注意事项 存储路径：{userData}/Data/AutomationConfigs/{id}.json
 */
export interface AutomationConfigData {
  id: string
  name: string
  version: string                      // 配置格式版本，初始 "1.0.0"
  mode: 'manual' | 'smart'             // 自动化模式（当前仅实现 manual）
  params: ManualConfigParams | SmartConfigParams  // 根据 mode 动态类型
  createdAt: number
  updatedAt: number
}

/**
 * 自动化测试执行结果
 */
export interface AutomationTestResult {
  success: boolean      // 是否成功
  message: string       // 执行消息（成功/失败原因）
  duration?: number     // 执行耗时（毫秒）
}

/**
 * 显示器信息
 * @注意事项 bounds 坐标是相对于主显示器左上角的逻辑坐标
 */
export interface DisplayInfo {
  id: number                           // 显示器唯一 ID（索引）
  bounds: { x: number; y: number; width: number; height: number }  // 逻辑坐标和尺寸
  scaleFactor: number                  // DPI 缩放因子
  isPrimary: boolean                   // 是否主显示器
}

