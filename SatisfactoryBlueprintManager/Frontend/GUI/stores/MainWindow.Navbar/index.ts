import { defineStore } from 'pinia'
import type { MainWindowNavbarState } from './types'
import type { NavItem } from '@gui/pages/MainWindow/Shell/types'

export const useMainWindowNavbarStore = defineStore('mainWindowNavbar', {
  state: (): MainWindowNavbarState => ({
    activeRoute: '/welcome',
    topNavItems: [
      {
        route: '/welcome',
        label: 'Welcome',
        icon: 'House',
      },
      {
        route: '/blueprint',
        label: 'Blueprint',
        icon: 'Document',
      },
    ] as NavItem[],
    bottomNavItems: [
      {
        route: '/settings',
        label: 'Settings',
        icon: 'Setting',
      },
    ] as NavItem[],
  }),

  actions: {
    setActiveRoute(route: string) {
      this.activeRoute = route
    },

    getNavItemByRoute(route: string): NavItem | undefined {
      const allItems = [...this.topNavItems, ...this.bottomNavItems]
      return allItems.find((item) => item.route === route)
    },
  },
})

