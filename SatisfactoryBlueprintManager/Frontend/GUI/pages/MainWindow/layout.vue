<template>
  <div class="main-layout">
    <!-- 自定义标题栏 -->
    <header class="layout-header">
      <MainWindowTitleBar />
    </header>

    <!-- 主体容器：包含左侧导航栏和主内容区 -->
    <div class="layout-body">
      <!-- 左侧导航栏 -->
      <aside class="layout-drawer">
        <MainWindowNavbar />
      </aside>

      <!-- 主内容区域 -->
      <main class="layout-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import MainWindowTitleBar from './Shell/MainWindow.TitleBar/index.vue'
import MainWindowNavbar from './Shell/MainWindow.Navbar/index.vue'
import { useActiveBlueprintStore } from './MainPanel/Blueprint/stores/ActiveBlueprint'
import { useBlueprintSourceStore } from './MainPanel/Blueprint/stores/BlueprintSource'
import { useGlobalTagsStore } from './MainPanel/Blueprint/stores/GlobalTags'

onMounted(async () => {
  try {
    const activeBlueprintStore = useActiveBlueprintStore()
    const blueprintSourceStore = useBlueprintSourceStore()
    const globalTagsStore = useGlobalTagsStore()

    console.log('[MainWindow] 开始预加载数据...')

    // 预加载所有必要数据（并行加载以提高性能）
    await Promise.all([
      blueprintSourceStore.loadRootNodes(),        // 加载蓝图源
      activeBlueprintStore.initializeConfig(),     // 加载上次使用的配置
      globalTagsStore.initializeGlobalTags(),      // 加载全局标签
    ])

    console.log('[MainWindow] 数据预加载完成')

    // 设置快速访问数据同步（延迟一点确保数据已加载）
    setTimeout(() => {
      activeBlueprintStore.setupQuickAccessSync()
      console.log('[MainWindow] 已启用快速访问数据同步')
    }, 500)
  } catch (error) {
    console.error('[MainWindow] 预加载失败:', error)
  }
})
</script>

<style scoped lang="scss">
.main-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.layout-header {
  height: 32px;
  flex-shrink: 0;
  padding: 0;
  overflow: hidden;
}

.layout-body {
  display: flex;
  flex-direction: row;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.layout-drawer {
  width: 60px;
  flex-shrink: 0;
  background-color: #f5f5f5;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
  overflow-x: hidden;
}

.layout-content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>

