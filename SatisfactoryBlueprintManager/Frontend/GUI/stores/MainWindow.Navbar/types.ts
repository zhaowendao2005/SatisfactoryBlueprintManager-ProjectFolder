/**
 * MainWindow.Navbar Store 专用类型
 */
import type { NavItem } from '@gui/pages/MainWindow/Shell/types'

export interface MainWindowNavbarState {
  /** 当前激活的路由路径 */
  activeRoute: string
  /** 上组导航项（Welcome、Blueprint） */
  topNavItems: NavItem[]
  /** 下组导航项（Settings 等） */
  bottomNavItems: NavItem[]
}

