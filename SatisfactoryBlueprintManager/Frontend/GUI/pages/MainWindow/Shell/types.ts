/**
 * MainWindow Shell 层共享类型
 */

/**
 * 导航栏项配置
 */
export interface NavItem {
  /** 路由路径 */
  route: string
  /** 显示标签 */
  label: string
  /** Element Plus 图标名称 */
  icon: string
  /** 是否禁用，默认 false */
  disabled?: boolean
}

/**
 * 导航栏分组配置
 */
export interface NavGroup {
  /** 分组名称（用于 key） */
  name: string
  /** 分组内的导航项 */
  items: NavItem[]
  /** flex-grow 比例 */
  flexGrow: number
}

