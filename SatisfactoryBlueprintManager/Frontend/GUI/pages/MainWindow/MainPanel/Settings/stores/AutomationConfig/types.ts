/**
 * Settings.AutomationConfig Store 专用类型
 */
import type { AutomationConfigMeta, AutomationConfigData } from '@types/automation-config'

export interface AutomationConfigState {
  configList: AutomationConfigMeta[]           // 配置列表
  currentConfigId: string | null               // 当前选中配置 ID
  currentConfig: AutomationConfigData | null   // 当前完整配置数据
  isLoading: boolean                           // 加载状态
}

