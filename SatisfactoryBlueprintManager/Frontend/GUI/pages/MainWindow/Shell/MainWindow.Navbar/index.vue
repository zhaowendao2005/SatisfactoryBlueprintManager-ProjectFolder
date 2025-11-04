<template>
  <div class="navbar-container">
    <div class="nav-group-top">
      <NavItem
        v-for="item in topNavItems"
        :key="item.route"
        :item="item"
        :is-active="item.route === activeRoute"
        @click="handleNavClick"
      />
    </div>
    <div class="nav-group-bottom">
      <NavItem
        v-for="item in bottomNavItems"
        :key="item.route"
        :item="item"
        :is-active="item.route === activeRoute"
        @click="handleNavClick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import NavItem from './NavItem.vue'
import { useMainWindowNavbarStore } from '@gui/stores/MainWindow.Navbar'
import type { NavItem as NavItemType } from '@gui/pages/MainWindow/Shell/types'

const router = useRouter()
const route = useRoute()
const navbarStore = useMainWindowNavbarStore()

// 同步 Store 与路由
onMounted(() => {
  // 初始化时设置当前路由
  const navItem = navbarStore.getNavItemByRoute(route.path)
  if (navItem) {
    navbarStore.setActiveRoute(route.path)
  }

  // 监听路由变化
  watch(
    () => route.path,
    (path) => {
      const navItem = navbarStore.getNavItemByRoute(path)
      if (navItem) {
        navbarStore.setActiveRoute(path)
      }
    }
  )
})

const activeRoute = computed(() => navbarStore.activeRoute)
const topNavItems = computed(() => navbarStore.topNavItems)
const bottomNavItems = computed(() => navbarStore.bottomNavItems)

const handleNavClick = async (item: NavItemType) => {
  if (item.disabled) return

  try {
    await router.push(item.route)
    navbarStore.setActiveRoute(item.route)
  } catch (error) {
    console.error('Failed to navigate:', error)
    // 保持当前选中状态
  }
}
</script>

<style scoped lang="scss">
.navbar-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 60px;
  background-color: #f5f5f5;

  .nav-group-top {
    flex-grow: 5;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px 0;
  }

  .nav-group-bottom {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 8px;
    padding: 16px 0;
  }
}
</style>

